import 'server-only'
import { randomBytes } from 'node:crypto'
import Stripe from 'stripe'
import { urlDelSitio } from './sitio'
import { createAdminClient } from './supabase/admin'
import { hoyMx, sumarMeses, montoCuota, fechaDia } from './format'
import { enviarCorreoCompra, enviarAviso } from './correo'

// Grupo del Taller de Baraja Española que vende la landing actual.
export const BARAJA_GRUPO_ID = Number(process.env.BARAJA_GRUPO_ID || 5)

const METODO = { card: 'tarjeta', oxxo: 'oxxo', customer_balance: 'spei' }
const centavos = (n) => Math.round(Number(n) * 100)
const tel10 = (v) => String(v || '').replace(/\D/g, '').slice(-10) || null
const escaparLike = (v) => v.replace(/[%_\\]/g, '\\$&')

export { urlDelSitio }

let cliente
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Falta STRIPE_SECRET_KEY')
  if (!cliente) cliente = new Stripe(process.env.STRIPE_SECRET_KEY)
  return cliente
}

async function nextId(db, seq) {
  const { data, error } = await db.rpc('next_id', { p_seq: seq })
  if (error) throw error
  return data
}

const esCorreoTecnico = (email) => !email || /@acceso\.espiritistasacantar\.com$/i.test(email)

// Cliente de Stripe por correo: permite SPEI (transferencia) y que Stripe recuerde sus datos.
async function clienteStripe(stripe, perfil) {
  if (esCorreoTecnico(perfil?.email)) return null
  const { data } = await stripe.customers.list({ email: perfil.email, limit: 1 })
  if (data[0]) return data[0].id
  const nuevo = await stripe.customers.create({
    email: perfil.email,
    name: [perfil.first_name, perfil.last_name].filter(Boolean).join(' ') || undefined,
    metadata: { profile_id: String(perfil.id), matricula: perfil.matricula || '' },
  })
  return nuevo.id
}

// ---------------------------------------------------------------------
// Crear sesiones de pago
// ---------------------------------------------------------------------

// Inscripción a un grupo. Si el grupo es a plazos, se cobra la primera cuota y
// las demás quedan pendientes en "Mis pagos".
export async function crearCheckoutInscripcion({ grupo, curso, perfil }) {
  const stripe = getStripe()
  const base = await urlDelSitio()
  const n = Math.max(1, grupo.installments || 1)
  const monto = montoCuota(grupo)
  const usarPrecioBaraja = grupo.id === BARAJA_GRUPO_ID && n === 1 && !!process.env.STRIPE_PRICE_ID_BARAJA

  const metadata = {
    tipo: 'inscripcion',
    curso_id: String(curso.id),
    grupo_id: String(grupo.id),
    profile_id: perfil ? String(perfil.id) : '',
  }
  const params = {
    mode: 'payment',
    locale: 'es-419',
    line_items: [
      usarPrecioBaraja
        ? { price: process.env.STRIPE_PRICE_ID_BARAJA, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: 'mxn',
              unit_amount: centavos(monto),
              product_data: {
                name: curso.title,
                description: grupo.recurrence ? `${grupo.name} · Colegiatura ${grupo.recurrence} (primer periodo)` : n > 1 ? `${grupo.name} · Pago 1 de ${n}` : grupo.name,
              },
            },
          },
    ],
    metadata,
    payment_intent_data: { metadata, description: `${curso.title} · ${grupo.name}` },
    success_url: `${base}/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/cursos/${curso.id}`,
  }

  const customer = perfil ? await clienteStripe(stripe, perfil) : null
  if (customer) params.customer = customer
  if (!perfil) {
    params.phone_number_collection = { enabled: true }
    params.custom_fields = [{ key: 'nombre', label: { type: 'custom', custom: 'Nombre completo' }, type: 'text' }]
  }
  const session = await stripe.checkout.sessions.create(params)
  return session.url
}

// Pago de una cuota pendiente desde "Mis pagos".
export async function crearCheckoutCuota({ pago, curso, perfil }) {
  const stripe = getStripe()
  const base = await urlDelSitio()
  const metadata = {
    tipo: 'cuota',
    payment_id: String(pago.id),
    profile_id: String(perfil.id),
    grupo_id: pago.group_id ? String(pago.group_id) : '',
    curso_id: pago.course_id ? String(pago.course_id) : '',
  }
  const params = {
    mode: 'payment',
    locale: 'es-419',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'mxn',
        unit_amount: centavos(pago.amount),
        product_data: {
          name: `Cuota · ${curso?.title || 'Curso'}`,
          description: pago.due_date ? `Vence el ${fechaDia(pago.due_date)}` : undefined,
        },
      },
    }],
    metadata,
    payment_intent_data: { metadata, description: `Cuota ${pago.id} · ${curso?.title || ''}` },
    success_url: `${base}/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/mi-espacio/pagos`,
  }
  const customer = await clienteStripe(stripe, perfil)
  if (customer) params.customer = customer
  const session = await stripe.checkout.sessions.create(params)
  return session.url
}

// ---------------------------------------------------------------------
// Registrar un pago confirmado (lo llaman el webhook y la página /gracias).
// Es idempotente: si llega dos veces, la segunda no duplica nada.
// ---------------------------------------------------------------------

// Método de pago y comisión real de Stripe (para el reparto con docentes).
async function datosDelPago(stripe, session) {
  const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!piId) return { metodo: 'otro', fee: 0 }
  try {
    const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge.balance_transaction'] })
    const cargo = pi.latest_charge
    const fee = typeof cargo?.balance_transaction === 'object' ? (cargo.balance_transaction.fee || 0) / 100 : 0
    return { metodo: METODO[cargo?.payment_method_details?.type] || 'otro', fee }
  } catch {
    return { metodo: 'otro', fee: 0 }
  }
}

export async function cumplirCheckout(session) {
  if (session.payment_status !== 'paid') return { estado: 'pendiente' }
  const md = session.metadata || {}
  // Las compras de la app anterior solo traen curso_id y grupo_id.
  const tipo = md.tipo || (md.grupo_id ? 'inscripcion' : null)
  if (!['inscripcion', 'cuota', 'producto'].includes(tipo)) return { estado: 'ignorado' }

  const stripe = getStripe()
  const db = createAdminClient()
  const { metodo, fee } = await datosDelPago(stripe, session)
  const pagoStripe = {
    id: (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) || session.id,
    monto: (session.amount_total || 0) / 100,
    metodo,
    fee,
  }
  if (tipo === 'producto') return cumplirProducto(db, session, pagoStripe)
  return tipo === 'cuota' ? cumplirCuota(db, session, pagoStripe) : cumplirInscripcion(db, session, pagoStripe)
}

// Compra de un ebook o material digital: acceso permanente en «Biblioteca».
async function cumplirProducto(db, session, pagoStripe) {
  const md = session.metadata
  const { data: producto } = await db.from('products').select('id, title').eq('id', Number(md.product_id)).maybeSingle()
  if (!producto) {
    console.error('Stripe: producto no encontrado', md)
    return { estado: 'error' }
  }
  const detalles = session.customer_details || {}
  const nombreCampo = (session.custom_fields || []).find((c) => c.key === 'nombre')?.text?.value
  const { perfil, nuevo } = await obtenerPerfil(db, {
    profileId: md.profile_id ? Number(md.profile_id) : null,
    email: String(detalles.email || session.customer_email || '').trim().toLowerCase(),
    nombre: String(nombreCampo || detalles.name || '').trim(),
    telefono: detalles.phone || '',
    sessionId: session.id,
  })
  const { error } = await db.from('product_purchases').insert({
    product_id: producto.id,
    profile_id: perfil.id,
    amount: pagoStripe.monto,
    gateway_fee: pagoStripe.fee,
    method: pagoStripe.metodo,
    stripe_payment_id: pagoStripe.id,
  })
  if (error) {
    if (error.code === '23505') return { estado: 'ya', profileId: perfil.id }
    throw error
  }
  await db.from('audit_log').insert({ actor_id: null, action: 'compra_producto', entity: 'product', entity_id: String(producto.id), detail: { profile: perfil.id, stripe: pagoStripe.id, monto: pagoStripe.monto } })

  if (!esCorreoTecnico(perfil.email)) {
    try {
      const base = await urlBaseParaCorreo()
      await enviarAviso({
        para: perfil.email,
        asunto: `Tu material «${producto.title}» ya está listo`,
        titulo: `¡Gracias por tu compra${perfil.first_name && perfil.first_name !== 'Estudiante' ? `, ${perfil.first_name}` : ''}!`,
        parrafos: [
          `«${producto.title}» ya está en tu biblioteca de EAC Academia. Puedes leerlo o descargarlo cuando quieras.`,
          ...(nuevo ? ['Creamos tu cuenta con este correo: con el botón eliges tu contraseña.'] : []),
        ],
        boton: nuevo ? 'Crear mi contraseña' : 'Ir a mi biblioteca',
        enlace: nuevo ? `${base}/gracias?session_id=${session.id}` : `${base}/mi-espacio/biblioteca`,
      })
    } catch (e) {
      console.error('Correo de compra de producto', e)
    }
  }
  return { estado: 'ok', profileId: perfil.id, nuevo }
}

// Compra de un ebook o material digital.
export async function crearCheckoutProducto({ producto, perfil }) {
  const stripe = getStripe()
  const base = await urlDelSitio()
  const metadata = { tipo: 'producto', product_id: String(producto.id), profile_id: perfil ? String(perfil.id) : '' }
  const params = {
    mode: 'payment',
    locale: 'es-419',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'mxn',
        unit_amount: centavos(producto.price),
        product_data: { name: producto.title, description: producto.subtitle || 'Material digital en PDF · EAC Academia', ...(producto.cover_url ? { images: [producto.cover_url] } : {}) },
      },
    }],
    metadata,
    payment_intent_data: { metadata, description: `Tienda · ${producto.title}` },
    success_url: `${base}/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/tienda/${producto.id}`,
  }
  const customer = perfil ? await clienteStripe(stripe, perfil) : null
  if (customer) params.customer = customer
  if (!perfil) {
    params.phone_number_collection = { enabled: true }
    params.custom_fields = [{ key: 'nombre', label: { type: 'custom', custom: 'Nombre completo' }, type: 'text' }]
  }
  const session = await stripe.checkout.sessions.create(params)
  return session.url
}

async function cumplirCuota(db, session, pagoStripe) {
  const md = session.metadata
  const { data: pago } = await db
    .from('payments')
    .select('id, profile_id, status, stripe_payment_id')
    .eq('id', Number(md.payment_id))
    .maybeSingle()
  if (!pago || String(pago.profile_id) !== md.profile_id) {
    console.error('Stripe: cuota no encontrada', md)
    return { estado: 'error' }
  }
  if (pago.status === 'pagado') return { estado: 'ya', profileId: pago.profile_id }

  const hoy = hoyMx()
  const { data: actualizado, error } = await db
    .from('payments')
    .update({
      status: 'pagado',
      paid_on: hoy,
      amount_received: pagoStripe.monto,
      method: pagoStripe.metodo,
      stripe_payment_id: pagoStripe.id,
      gateway_fee: pagoStripe.fee,
    })
    .eq('id', pago.id)
    .neq('status', 'pagado')
    .select('id')
  if (error) {
    if (error.code === '23505') return { estado: 'ya', profileId: pago.profile_id }
    throw error
  }
  if (actualizado?.length) {
    await db.from('audit_log').insert({ actor_id: null, action: 'pago_stripe_cuota', entity: 'payment', entity_id: String(pago.id), detail: { stripe: pagoStripe.id, metodo: pagoStripe.metodo, monto: pagoStripe.monto } })
  }
  return { estado: 'ok', profileId: pago.profile_id }
}

async function cumplirInscripcion(db, session, pagoStripe) {
  const md = session.metadata
  const { data: grupo } = await db
    .from('course_groups')
    .select('id, course_id, name, price_total, installments, recurrence, courses(title)')
    .eq('id', Number(md.grupo_id))
    .maybeSingle()
  if (!grupo) {
    console.error('Stripe: grupo no encontrado', md)
    return { estado: 'error' }
  }

  const detalles = session.customer_details || {}
  const nombreCampo = (session.custom_fields || []).find((c) => c.key === 'nombre')?.text?.value
  const { perfil, nuevo } = await obtenerPerfil(db, {
    profileId: md.profile_id ? Number(md.profile_id) : null,
    email: String(detalles.email || session.customer_email || '').trim().toLowerCase(),
    nombre: String(nombreCampo || detalles.name || '').trim(),
    telefono: detalles.phone || '',
    sessionId: session.id,
  })

  // 1. Acceso al grupo
  const { data: insc } = await db.from('enrollments').select('id, status').eq('profile_id', perfil.id).eq('group_id', grupo.id).maybeSingle()
  if (!insc) {
    const { error } = await db.from('enrollments').insert({
      id: await nextId(db, 'enrollments_id_seq'),
      profile_id: perfil.id,
      course_id: grupo.course_id,
      group_id: grupo.id,
      status: 'activa',
      source: 'compra',
    })
    if (error && error.code !== '23505') throw error
  } else if (insc.status !== 'activa') {
    await db.from('enrollments').update({ status: 'activa', drop_reason: null }).eq('id', insc.id)
  }

  // 2. Pago (stripe_payment_id es único: si ya existe, esta compra ya se registró)
  const hoy = hoyMx()
  const n = Math.max(1, grupo.installments || 1)
  const { data: previos } = await db.from('payments').select('id').eq('profile_id', perfil.id).eq('group_id', grupo.id).limit(1)
  const { error: errPago } = await db.from('payments').insert({
    id: await nextId(db, 'payments_id_seq'),
    profile_id: perfil.id,
    course_id: grupo.course_id,
    group_id: grupo.id,
    amount: pagoStripe.monto,
    amount_received: pagoStripe.monto,
    due_date: hoy,
    paid_on: hoy,
    status: 'pagado',
    method: pagoStripe.metodo,
    stripe_payment_id: pagoStripe.id,
    gateway_fee: pagoStripe.fee,
    notes: grupo.recurrence ? `Pago en línea · colegiatura ${grupo.recurrence}` : n > 1 ? `Pago en línea · cuota 1 de ${n}` : 'Pago en línea',
  })
  if (errPago) {
    if (errPago.code === '23505') return { estado: 'ya', profileId: perfil.id }
    throw errPago
  }

  // 3. Cuotas restantes (solo si administración no le había generado cuotas antes)
  if (n > 1 && !previos?.length && Number(grupo.price_total) > 0) {
    const monto = montoCuota(grupo)
    const filas = []
    for (let i = 1; i < n; i++) {
      filas.push({
        id: await nextId(db, 'payments_id_seq'),
        profile_id: perfil.id,
        course_id: grupo.course_id,
        group_id: grupo.id,
        amount: monto,
        due_date: sumarMeses(hoy, i),
        status: 'pendiente',
      })
    }
    await db.from('payments').insert(filas)
  }

  await db.from('audit_log').insert({
    actor_id: null,
    action: 'compra_stripe',
    entity: 'enrollment',
    entity_id: `${perfil.id}:${grupo.id}`,
    detail: { stripe: pagoStripe.id, metodo: pagoStripe.metodo, monto: pagoStripe.monto, cuenta_nueva: nuevo },
  })

  const correo = perfil.email || ''
  if (!esCorreoTecnico(correo)) {
    try {
      await enviarCorreoCompra({
        para: correo,
        nombre: perfil.first_name,
        curso: grupo.courses?.title || 'tu curso',
        grupo: grupo.name,
        cuentaNueva: nuevo,
        enlace: nuevo ? `${await urlBaseParaCorreo()}/gracias?session_id=${session.id}` : `${await urlBaseParaCorreo()}/entrar`,
        cuotasPendientes: n > 1 ? n - 1 : 0,
      })
    } catch (e) {
      console.error('No se pudo enviar el correo de la compra', e)
    }
  }
  return { estado: 'ok', profileId: perfil.id, nuevo }
}

async function urlBaseParaCorreo() {
  try {
    return await urlDelSitio()
  } catch {
    return (process.env.NEXT_PUBLIC_SITE_URL || 'https://espiritistasacantar.com').replace(/\/$/, '')
  }
}

const PERFIL_COLS = 'id, matricula, first_name, last_name, email, auth_user_id'

// Encuentra al estudiante (por sesión o por correo) o le crea perfil y cuenta.
async function obtenerPerfil(db, { profileId, email, nombre, telefono, sessionId }) {
  if (profileId) {
    const { data } = await db.from('profiles').select(PERFIL_COLS).eq('id', profileId).maybeSingle()
    if (data) {
      // Etapa 2 del acceso: si no tenía correo real, guardamos el que usó para pagar.
      if (!data.email && email) {
        const { data: otro } = await db.from('profiles').select('id').ilike('email', escaparLike(email)).maybeSingle()
        if (!otro) {
          await db.from('profiles').update({ email }).eq('id', data.id)
          data.email = email
        }
      }
      return { perfil: data, nuevo: false }
    }
  }
  if (!email) throw new Error('La compra no trae correo')

  const buscar = async () => (await db.from('profiles').select(PERFIL_COLS).ilike('email', escaparLike(email)).maybeSingle()).data
  const existente = await buscar()
  if (existente) return { perfil: existente, nuevo: false }

  const { data: id } = await db.rpc('next_profile_id')
  const { data: matricula } = await db.rpc('next_matricula')
  const { data: creado, error: errAuth } = await db.auth.admin.createUser({
    email,
    password: randomBytes(24).toString('base64url'),
    email_confirm: true,
    app_metadata: { profile_id: id, role: 'student' },
    // La persona crea su contraseña en /gracias con esta misma compra.
    user_metadata: { matricula, contrasena_pendiente: sessionId },
  })
  if (errAuth) {
    // Puede que el webhook y /gracias lleguen al mismo tiempo: esperamos al otro.
    await new Promise((r) => setTimeout(r, 1500))
    const otro = await buscar()
    if (otro) return { perfil: otro, nuevo: false }
    throw errAuth
  }

  const [primero, ...resto] = nombre.split(/\s+/).filter(Boolean)
  const perfil = {
    id,
    matricula,
    role: 'student',
    first_name: primero || 'Estudiante',
    last_name: resto.join(' ') || null,
    phone: telefono || null,
    phone10: tel10(telefono),
    email,
    auth_user_id: creado.user.id,
    must_change_password: false,
    source: 'compra',
  }
  const { error } = await db.from('profiles').insert(perfil)
  if (error) {
    await db.auth.admin.deleteUser(creado.user.id)
    const otro = await buscar()
    if (otro) return { perfil: otro, nuevo: false }
    throw error
  }
  return { perfil, nuevo: true }
}

// Perfil al que se asignó una compra (para la página /gracias).
export async function perfilDeCheckout(db, session) {
  const md = session.metadata || {}
  if (md.profile_id) {
    const { data } = await db.from('profiles').select(PERFIL_COLS).eq('id', Number(md.profile_id)).maybeSingle()
    if (data) return data
  }
  const email = String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase()
  if (!email) return null
  const { data } = await db.from('profiles').select(PERFIL_COLS).ilike('email', escaparLike(email)).maybeSingle()
  return data
}
