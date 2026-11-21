'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin, audit, nextId, txt, num, nullable, DOMINIO_CORREO_TECNICO } from '@/lib/admin'
import { hoyMx, sumarMeses } from '@/lib/format'
import { enviarAviso } from '@/lib/correo'
import { urlDelSitio } from '@/lib/sitio'
import { emitirConstancia } from '@/lib/constancias'

const volver = (ruta, msg, tipo = 'ok') => redirect(`${ruta}${ruta.includes('?') ? '&' : '?'}${tipo}=${encodeURIComponent(msg)}`)
const esCorreo = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
const tel10 = (v) => String(v || '').replace(/\D/g, '').slice(-10) || null


// ---------------------------------------------------------------------
// Estudiantes
// ---------------------------------------------------------------------
export async function crearEstudiante(formData) {
  const { profile: actor, db } = await requireAdmin()
  const nombre = txt(formData, 'first_name')
  const apellidos = txt(formData, 'last_name')
  const telefono = txt(formData, 'phone')
  const email = txt(formData, 'email').toLowerCase()
  const password = String(formData.get('password') || '')
  const grupoId = txt(formData, 'group_id')
  const ruta = '/admin/estudiantes/nuevo'

  if (!nombre) volver(ruta, 'Escribe el nombre.', 'error')
  if (!telefono && !email) volver(ruta, 'Escribe al menos un teléfono o un correo para que pueda entrar.', 'error')
  if (email && !esCorreo(email)) volver(ruta, 'El correo no parece válido.', 'error')
  if (password.length < 8) volver(ruta, 'La contraseña temporal debe tener al menos 8 caracteres.', 'error')

  if (email) {
    const { data: existe } = await db.from('profiles').select('id').ilike('email', email).maybeSingle()
    if (existe) volver(ruta, 'Ya existe un perfil con ese correo.', 'error')
  }

  const { data: id } = await db.rpc('next_profile_id')
  const { data: matricula } = await db.rpc('next_matricula')
  const correoCuenta = email || `alumno-${id}@${DOMINIO_CORREO_TECNICO}`

  const { data: creado, error: errAuth } = await db.auth.admin.createUser({
    email: correoCuenta,
    password,
    email_confirm: true,
    app_metadata: { profile_id: id, role: 'student' },
    user_metadata: { matricula, correo_tecnico: !email },
  })
  if (errAuth) volver(ruta, `No se pudo crear la cuenta: ${errAuth.message}`, 'error')

  const { error } = await db.from('profiles').insert({
    id,
    matricula,
    role: 'student',
    first_name: nombre,
    last_name: nullable(apellidos),
    phone: nullable(telefono),
    phone10: tel10(telefono),
    email: nullable(email),
    auth_user_id: creado.user.id,
    must_change_password: true,
    source: 'manual',
  })
  if (error) {
    await db.auth.admin.deleteUser(creado.user.id)
    volver(ruta, `No se pudo guardar el perfil: ${error.message}`, 'error')
  }
  await audit(db, actor, 'crear_estudiante', 'profile', id, { matricula })

  if (grupoId) await inscribirInterno(db, actor, id, Number(grupoId), formData.get('generar_cuotas') === 'on')
  revalidatePath('/admin/estudiantes')
  volver(`/admin/estudiantes/${id}`, `Estudiante creado con la matrícula ${matricula}. Comparte su contraseña temporal; se le pedirá cambiarla al entrar.`)
}

export async function actualizarEstudiante(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const ruta = `/admin/estudiantes/${id}`
  const email = txt(formData, 'email').toLowerCase()
  const telefono = txt(formData, 'phone')
  if (email && !esCorreo(email)) volver(ruta, 'El correo no parece válido.', 'error')

  const { data: actual } = await db.from('profiles').select('id, email, auth_user_id').eq('id', id).single()
  if (email && email !== (actual.email || '')) {
    const { data: otro } = await db.from('profiles').select('id').ilike('email', email).neq('id', id).maybeSingle()
    if (otro) volver(ruta, 'Ese correo ya pertenece a otro perfil.', 'error')
    if (actual.auth_user_id) {
      const { error } = await db.auth.admin.updateUserById(actual.auth_user_id, { email, email_confirm: true })
      if (error) volver(ruta, `No se pudo actualizar el correo de acceso: ${error.message}`, 'error')
    }
  }
  const cambios = {
    first_name: txt(formData, 'first_name') || null,
    last_name: nullable(txt(formData, 'last_name')),
    phone: nullable(telefono),
    phone10: tel10(telefono),
    email: nullable(email),
  }
  const { error } = await db.from('profiles').update(cambios).eq('id', id)
  if (error) volver(ruta, `No se pudo guardar: ${error.message}`, 'error')
  await audit(db, actor, 'actualizar_estudiante', 'profile', id, cambios)
  revalidatePath(ruta)
  volver(ruta, 'Datos actualizados.')
}

export async function restablecerContrasena(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const ruta = `/admin/estudiantes/${id}`
  const password = String(formData.get('password') || '')
  if (password.length < 8) volver(ruta, 'La contraseña temporal debe tener al menos 8 caracteres.', 'error')
  const { data: p } = await db.from('profiles').select('auth_user_id').eq('id', id).single()
  if (!p?.auth_user_id) volver(ruta, 'Este perfil aún no tiene cuenta de acceso.', 'error')
  const { error } = await db.auth.admin.updateUserById(p.auth_user_id, { password })
  if (error) volver(ruta, `No se pudo cambiar la contraseña: ${error.message}`, 'error')
  await db.from('profiles').update({ must_change_password: true }).eq('id', id)
  await audit(db, actor, 'restablecer_contrasena', 'profile', id)
  volver(ruta, 'Contraseña temporal asignada. Se le pedirá cambiarla al entrar.')
}

// ---------------------------------------------------------------------
// Inscripciones (accesos)
// ---------------------------------------------------------------------
async function inscribirInterno(db, actor, profileId, groupId, generarCuotas) {
  const { data: g } = await db.from('course_groups').select('id, course_id, price_total, installments, frequency').eq('id', groupId).single()
  const { data: existente } = await db.from('enrollments').select('id').eq('profile_id', profileId).eq('group_id', groupId).maybeSingle()
  if (existente) {
    await db.from('enrollments').update({ status: 'activa', drop_reason: null }).eq('id', existente.id)
  } else {
    await db.from('enrollments').insert({
      id: await nextId(db, 'enrollments_id_seq'),
      profile_id: profileId,
      course_id: g.course_id,
      group_id: groupId,
      status: 'activa',
      source: 'manual',
    })
  }
  await audit(db, actor, 'inscribir', 'enrollment', `${profileId}:${groupId}`, { generarCuotas })

  if (generarCuotas && Number(g.price_total) > 0) {
    const n = Math.max(1, g.installments || 1)
    const monto = Math.round((Number(g.price_total) / n) * 100) / 100
    const hoy = hoyMx()
    const filas = []
    for (let i = 0; i < n; i++) {
      filas.push({
        id: await nextId(db, 'payments_id_seq'),
        profile_id: profileId,
        course_id: g.course_id,
        group_id: groupId,
        amount: monto,
        due_date: sumarMeses(hoy, i),
        status: 'pendiente',
      })
    }
    await db.from('payments').insert(filas)
  }
}

export async function inscribir(formData) {
  const { profile: actor, db } = await requireAdmin()
  const profileId = Number(formData.get('profile_id'))
  const groupId = Number(formData.get('group_id'))
  const ruta = `/admin/estudiantes/${profileId}`
  if (!groupId) volver(ruta, 'Elige un grupo.', 'error')
  await inscribirInterno(db, actor, profileId, groupId, formData.get('generar_cuotas') === 'on')
  revalidatePath(ruta)
  volver(ruta, 'Acceso asignado.')
}

export async function cambiarEstatusInscripcion(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const profileId = Number(formData.get('profile_id'))
  const status = formData.get('status') === 'baja' ? 'baja' : 'activa'
  const motivo = txt(formData, 'drop_reason')
  await db.from('enrollments').update({ status, drop_reason: status === 'baja' ? nullable(motivo) : null }).eq('id', id)
  await audit(db, actor, status === 'baja' ? 'baja_inscripcion' : 'reactivar_inscripcion', 'enrollment', id, { motivo })
  revalidatePath(`/admin/estudiantes/${profileId}`)
  volver(`/admin/estudiantes/${profileId}`, status === 'baja' ? 'Inscripción dada de baja.' : 'Inscripción reactivada.')
}

// ---------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------
export async function registrarPago(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const regreso = txt(formData, 'regreso') || '/admin/pagos'
  const metodo = txt(formData, 'method') || 'transferencia'
  const { data: p } = await db.from('payments').select('id, amount, status').eq('id', id).single()
  if (!p) volver(regreso, 'No se encontró la cuota.', 'error')
  const recibido = num(formData, 'amount_received') || Number(p.amount)
  const { error } = await db
    .from('payments')
    .update({
      status: 'pagado',
      paid_on: txt(formData, 'paid_on') || hoyMx(),
      amount_received: recibido,
      method: ['tarjeta', 'spei', 'oxxo', 'efectivo', 'transferencia', 'otro'].includes(metodo) ? metodo : 'otro',
      notes: nullable(txt(formData, 'notes')),
      registered_by: actor.id,
      registered_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) volver(regreso, `No se pudo registrar: ${error.message}`, 'error')
  await audit(db, actor, 'registrar_pago', 'payment', id, { metodo, recibido })
  revalidatePath('/admin/pagos')
  volver(regreso, 'Pago registrado. Si era la cuota vencida, el acceso ya se reactivó.')
}

export async function agregarCuota(formData) {
  const { profile: actor, db } = await requireAdmin()
  const profileId = Number(formData.get('profile_id'))
  const groupId = Number(formData.get('group_id')) || null
  const ruta = `/admin/estudiantes/${profileId}`
  const monto = num(formData, 'amount')
  if (!monto) volver(ruta, 'Escribe el monto.', 'error')
  const yaPagado = formData.get('ya_pagado') === 'on'
  let courseId = null
  if (groupId) courseId = (await db.from('course_groups').select('course_id').eq('id', groupId).single()).data?.course_id ?? null
  const id = await nextId(db, 'payments_id_seq')
  const { error } = await db.from('payments').insert({
    id,
    profile_id: profileId,
    group_id: groupId,
    course_id: courseId,
    amount: monto,
    due_date: txt(formData, 'due_date') || hoyMx(),
    status: yaPagado ? 'pagado' : 'pendiente',
    paid_on: yaPagado ? hoyMx() : null,
    amount_received: yaPagado ? monto : 0,
    method: yaPagado ? txt(formData, 'method') || 'transferencia' : null,
    notes: nullable(txt(formData, 'notes')),
    registered_by: actor.id,
    registered_at: new Date().toISOString(),
  })
  if (error) volver(ruta, `No se pudo agregar: ${error.message}`, 'error')
  await audit(db, actor, yaPagado ? 'registrar_pago_nuevo' : 'agregar_cuota', 'payment', id, { monto })
  revalidatePath(ruta)
  volver(ruta, yaPagado ? 'Pago registrado.' : 'Cuota agregada.')
}

export async function cancelarCuota(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const regreso = txt(formData, 'regreso') || '/admin/pagos'
  await db.from('payments').update({ status: 'cancelado', registered_by: actor.id, registered_at: new Date().toISOString() }).eq('id', id)
  await audit(db, actor, 'cancelar_cuota', 'payment', id)
  volver(regreso, 'Cuota cancelada.')
}

// ---------------------------------------------------------------------
// Cursos, grupos, materiales y sesiones
// ---------------------------------------------------------------------
export async function guardarCurso(formData) {
  const { profile: actor, db } = await requireAdmin()
  const idTxt = txt(formData, 'id')
  const datos = {
    title: txt(formData, 'title'),
    description: nullable(txt(formData, 'description')),
    what_you_learn: nullable(txt(formData, 'what_you_learn')),
    duration_text: nullable(txt(formData, 'duration_text')),
    cover_url: nullable(txt(formData, 'cover_url')),
    manual_pdf_url: nullable(txt(formData, 'manual_pdf_url')),
    price: num(formData, 'price'),
    is_visible: formData.get('is_visible') === 'on',
    is_upcoming: formData.get('is_upcoming') === 'on',
    is_featured: formData.get('is_featured') === 'on',
  }
  if (!datos.title) volver(idTxt ? `/admin/cursos/${idTxt}` : '/admin/cursos', 'Escribe el nombre del curso.', 'error')
  let id = Number(idTxt)
  if (id) {
    await db.from('courses').update(datos).eq('id', id)
  } else {
    id = await nextId(db, 'courses_id_seq')
    await db.from('courses').insert({ id, ...datos })
  }
  await audit(db, actor, idTxt ? 'actualizar_curso' : 'crear_curso', 'course', id, { title: datos.title })
  revalidatePath('/admin/cursos')
  revalidatePath('/cursos')
  volver(`/admin/cursos/${id}`, idTxt ? 'Curso actualizado.' : 'Curso creado. Ahora agrega un grupo con su fecha y precio.')
}

export async function guardarGrupo(formData) {
  const { profile: actor, db } = await requireAdmin()
  const idTxt = txt(formData, 'id')
  const courseId = Number(formData.get('course_id'))
  const modalidad = txt(formData, 'modality')
  const datos = {
    course_id: courseId,
    name: txt(formData, 'name'),
    modality: ['en_linea', 'presencial', 'grabado', 'mixto'].includes(modalidad) ? modalidad : 'en_linea',
    starts_on: nullable(txt(formData, 'starts_on')),
    ends_on: nullable(txt(formData, 'ends_on')),
    price_total: num(formData, 'price_total'),
    enrollment_fee: num(formData, 'enrollment_fee'),
    installments: Math.max(1, Math.round(num(formData, 'installments') || 1)),
    frequency: nullable(txt(formData, 'frequency')),
    capacity: num(formData, 'capacity') || null,
    schedule_text: nullable(txt(formData, 'schedule_text')),
    whatsapp_url: nullable(txt(formData, 'whatsapp_url')),
    status: formData.get('status') === 'inactivo' ? 'inactivo' : 'activo',
  }
  if (!datos.name) volver(idTxt ? `/admin/grupos/${idTxt}` : `/admin/cursos/${courseId}`, 'Escribe el nombre del grupo.', 'error')
  let id = Number(idTxt)
  if (id) {
    await db.from('course_groups').update(datos).eq('id', id)
  } else {
    id = await nextId(db, 'course_groups_id_seq')
    await db.from('course_groups').insert({ id, ...datos })
  }
  await audit(db, actor, idTxt ? 'actualizar_grupo' : 'crear_grupo', 'group', id, { name: datos.name })
  revalidatePath(`/admin/cursos/${courseId}`)
  volver(`/admin/grupos/${id}`, idTxt ? 'Grupo actualizado.' : 'Grupo creado.')
}

export async function agregarRecurso(formData) {
  const { profile: actor, db } = await requireAdmin()
  const groupId = Number(formData.get('group_id'))
  const ruta = `/admin/grupos/${groupId}`
  const title = txt(formData, 'title')
  const url = txt(formData, 'url')
  if (!title || !/^https?:\/\//.test(url)) volver(ruta, 'Escribe el título y un enlace válido (https://…).', 'error')
  const id = await nextId(db, 'group_resources_id_seq')
  await db.from('group_resources').insert({ id, group_id: groupId, title, url, kind: formData.get('kind') === 'pdf' ? 'pdf' : 'video' })
  await audit(db, actor, 'agregar_material', 'group_resource', id, { title })
  revalidatePath(ruta)
  volver(ruta, 'Material agregado.')
}

export async function eliminarRecurso(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const groupId = Number(formData.get('group_id'))
  await db.from('group_resources').delete().eq('id', id)
  await audit(db, actor, 'eliminar_material', 'group_resource', id)
  revalidatePath(`/admin/grupos/${groupId}`)
  volver(`/admin/grupos/${groupId}`, 'Material eliminado.')
}

export async function agregarSesion(formData) {
  const { profile: actor, db } = await requireAdmin()
  const groupId = Number(formData.get('group_id'))
  const ruta = `/admin/grupos/${groupId}`
  const fecha = txt(formData, 'fecha')
  const horaTxt = txt(formData, 'hora')
  const title = txt(formData, 'title')
  if (!fecha || !horaTxt || !title) volver(ruta, 'Escribe título, fecha y hora de la sesión.', 'error')
  // Hora de Ciudad de México (UTC-6, sin horario de verano desde 2022).
  const startsAt = new Date(`${fecha}T${horaTxt}:00-06:00`).toISOString()
  const { count } = await db.from('live_sessions').select('id', { count: 'exact', head: true }).eq('group_id', groupId)
  const id = await nextId(db, 'live_sessions_id_seq')
  await db.from('live_sessions').insert({
    id,
    group_id: groupId,
    number: (count || 0) + 1,
    title,
    starts_at: startsAt,
    meet_url: nullable(txt(formData, 'meet_url')),
  })
  await audit(db, actor, 'agregar_sesion', 'live_session', id, { title, startsAt })
  revalidatePath(ruta)
  volver(ruta, 'Sesión programada.')
}

export async function actualizarSesion(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const groupId = Number(formData.get('group_id'))
  await db.from('live_sessions').update({
    meet_url: nullable(txt(formData, 'meet_url')),
    recording_url: nullable(txt(formData, 'recording_url')),
  }).eq('id', id)
  await audit(db, actor, 'actualizar_sesion', 'live_session', id)
  revalidatePath(`/admin/grupos/${groupId}`)
  volver(`/admin/grupos/${groupId}`, 'Sesión actualizada.')
}

export async function eliminarSesion(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const groupId = Number(formData.get('group_id'))
  await db.from('live_sessions').delete().eq('id', id)
  await audit(db, actor, 'eliminar_sesion', 'live_session', id)
  revalidatePath(`/admin/grupos/${groupId}`)
  volver(`/admin/grupos/${groupId}`, 'Sesión eliminada.')
}

// ---------------------------------------------------------------------
// Docentes y marketplace
// ---------------------------------------------------------------------
async function avisar(datos) {
  try {
    await enviarAviso(datos)
  } catch (e) {
    console.error('Aviso por correo', e)
  }
}

async function correoDe(db, profileId) {
  const { data } = await db.from('profiles').select('email, first_name').eq('id', profileId).maybeSingle()
  return data
}

export async function asignarDocente(formData) {
  const { profile: actor, db } = await requireAdmin()
  const groupId = Number(formData.get('group_id'))
  const profileId = Number(formData.get('profile_id'))
  const ruta = `/admin/grupos/${groupId}`
  const { data: p } = await db.from('profiles').select('role').eq('id', profileId).maybeSingle()
  if (p?.role !== 'teacher') volver(ruta, 'Esa persona no está aprobada como docente.', 'error')
  await db.from('group_teachers').upsert({ group_id: groupId, profile_id: profileId }, { onConflict: 'group_id,profile_id', ignoreDuplicates: true })
  await audit(db, actor, 'asignar_docente', 'group', groupId, { profileId })
  revalidatePath(ruta)
  volver(ruta, 'Docente asignado.')
}

export async function quitarDocente(formData) {
  const { profile: actor, db } = await requireAdmin()
  const groupId = Number(formData.get('group_id'))
  const profileId = Number(formData.get('profile_id'))
  await db.from('group_teachers').delete().eq('group_id', groupId).eq('profile_id', profileId)
  await audit(db, actor, 'quitar_docente', 'group', groupId, { profileId })
  revalidatePath(`/admin/grupos/${groupId}`)
  volver(`/admin/grupos/${groupId}`, 'Docente quitado del grupo.')
}

// Botones separados (formAction) para no depender de qué botón envió el formulario.
export async function aprobarSolicitud(formData) {
  return resolverSolicitud(formData, true)
}
export async function rechazarSolicitud(formData) {
  return resolverSolicitud(formData, false)
}

async function resolverSolicitud(formData, aprobar) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const notas = nullable(txt(formData, 'review_notes'))
  const { data: s } = await db.from('teacher_applications').select('*').eq('id', id).maybeSingle()
  if (!s || s.status !== 'pendiente') volver('/admin/docentes', 'Esa solicitud ya fue revisada.', 'error')

  await db.from('teacher_applications').update({
    status: aprobar ? 'aprobada' : 'rechazada', review_notes: notas, reviewed_by: actor.id, reviewed_at: new Date().toISOString(),
  }).eq('id', id)

  const persona = await correoDe(db, s.profile_id)
  if (aprobar) {
    const { data: actual } = await db.from('profiles').select('role').eq('id', s.profile_id).single()
    if (actual.role === 'student') await db.from('profiles').update({ role: 'teacher' }).eq('id', s.profile_id)
    await db.from('teacher_profiles').upsert({
      profile_id: s.profile_id, specialty: s.specialty, bio: s.bio, sample_url: s.sample_url, updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })
    await avisar({
      para: persona?.email,
      asunto: '¡Ya eres docente en EAC Academia!',
      titulo: `¡Te damos la bienvenida al equipo docente${persona?.first_name ? `, ${persona.first_name}` : ''}!`,
      parrafos: ['Aprobamos tu solicitud. Ya puedes entrar a tu portal de docente para proponer tu primer curso.', ...(notas ? [notas] : [])],
      boton: 'Entrar a mi portal',
      enlace: `${await urlDelSitio()}/docente`,
    })
  } else {
    await avisar({
      para: persona?.email,
      asunto: 'Tu solicitud para ser docente en EAC Academia',
      titulo: 'Gracias por tu interés en EAC Academia',
      parrafos: ['Por ahora no podemos aprobar tu solicitud.', ...(notas ? [notas] : []), 'Puedes escribirnos si tienes dudas.'],
    })
  }
  await audit(db, actor, aprobar ? 'aprobar_docente' : 'rechazar_docente', 'profile', s.profile_id, { solicitud: id })
  revalidatePath('/admin/docentes')
  volver('/admin/docentes', aprobar ? 'Docente aprobado. Le avisamos por correo.' : 'Solicitud rechazada.')
}

export async function aprobarCurso(formData) {
  return revisarCurso(formData, true)
}
export async function pedirCambiosCurso(formData) {
  return revisarCurso(formData, false)
}

async function revisarCurso(formData, aprobar) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const notas = nullable(txt(formData, 'review_notes'))
  const volverA = txt(formData, 'volver') === 'docentes' ? '/admin/docentes' : `/admin/cursos/${id}`
  const { data: c } = await db.from('courses').select('id, title, owner_id, review_status').eq('id', id).maybeSingle()
  if (!c) volver(volverA, 'No encontramos el curso.', 'error')
  if (!aprobar && !notas) volver(volverA, 'Escribe qué cambios necesita el curso.', 'error')

  await db.from('courses').update(aprobar
    ? { review_status: 'aprobado', review_notes: notas, is_visible: true }
    : { review_status: 'rechazado', review_notes: notas, is_visible: false }).eq('id', id)

  if (c.owner_id) {
    const persona = await correoDe(db, c.owner_id)
    await avisar({
      para: persona?.email,
      asunto: aprobar ? `Tu curso «${c.title}» ya está publicado` : `Tu curso «${c.title}» necesita cambios`,
      titulo: aprobar ? '¡Tu curso ya está publicado!' : 'Tu curso necesita algunos cambios',
      parrafos: aprobar
        ? [`«${c.title}» ya aparece en el catálogo de EAC Academia y está listo para recibir inscripciones.`, ...(notas ? [notas] : [])]
        : [`Revisamos «${c.title}» y antes de publicarlo te pedimos lo siguiente:`, notas, 'Cuando lo tengas, vuelve a enviarlo a revisión desde tu portal.'],
      boton: 'Ver mi curso',
      enlace: `${await urlDelSitio()}/docente/cursos/${id}`,
    })
  }
  await audit(db, actor, aprobar ? 'aprobar_curso' : 'pedir_cambios_curso', 'course', id, { notas })
  revalidatePath('/admin/docentes')
  revalidatePath('/cursos')
  volver(volverA, aprobar ? 'Curso aprobado y publicado.' : 'Le pedimos los cambios a quien lo propuso.')
}

export async function guardarReparto(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const ownerTxt = txt(formData, 'owner_id')
  const shareTxt = txt(formData, 'teacher_share')
  const share = shareTxt === '' ? null : Math.min(100, Math.max(0, Number(shareTxt)))
  await db.from('courses').update({ owner_id: ownerTxt ? Number(ownerTxt) : null, teacher_share: Number.isFinite(share) ? share : null }).eq('id', id)
  await audit(db, actor, 'reparto_curso', 'course', id, { owner: ownerTxt || null, share })
  revalidatePath(`/admin/cursos/${id}`)
  volver(`/admin/cursos/${id}`, 'Reparto guardado. Aplica a los pagos que se registren desde ahora.')
}

export async function guardarPorcentaje(formData) {
  const { profile: actor, db } = await requireAdmin()
  const pct = Number(txt(formData, 'pct'))
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) volver('/admin/liquidaciones', 'Escribe un porcentaje entre 0 y 100.', 'error')
  await db.from('settings').upsert({ key: 'docente_porcentaje', value: pct, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  await audit(db, actor, 'porcentaje_docente', 'settings', 'docente_porcentaje', { pct })
  volver('/admin/liquidaciones', `Desde ahora, los cursos sin porcentaje propio le dan ${pct} % a su docente.`)
}

export async function generarCorte(formData) {
  const { profile: actor, db } = await requireAdmin()
  const teacherId = Number(formData.get('teacher_id'))
  const inicio = txt(formData, 'inicio')
  const fin = txt(formData, 'fin')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) volver('/admin/liquidaciones', 'Periodo no válido.', 'error')
  const { data: filas } = await db.from('teacher_earnings').select('id, teacher_amount').eq('teacher_id', teacherId).is('payout_id', null).lte('earned_on', fin)
  if (!filas?.length) volver('/admin/liquidaciones', 'No hay ganancias pendientes en ese periodo.', 'error')
  const monto = Math.round(filas.reduce((a, f) => a + Number(f.teacher_amount), 0) * 100) / 100
  if (monto <= 0) volver('/admin/liquidaciones', 'El saldo de ese periodo no es positivo (hay pagos cancelados). Se sumará al siguiente corte.', 'error')
  const { data: corte, error } = await db.from('teacher_payouts').insert({
    teacher_id: teacherId, period_start: inicio, period_end: fin, amount: monto, created_by: actor.id,
  }).select('id').single()
  if (error) volver('/admin/liquidaciones', `No se pudo crear el corte: ${error.message}`, 'error')
  await db.from('teacher_earnings').update({ payout_id: corte.id }).in('id', filas.map((f) => f.id)).is('payout_id', null)
  await audit(db, actor, 'generar_corte', 'teacher_payout', corte.id, { teacherId, inicio, fin, monto })
  revalidatePath('/admin/liquidaciones')
  volver('/admin/liquidaciones', `Corte creado por ${monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}. Transfiere y márcalo como pagado.`)
}

export async function marcarCortePagado(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const referencia = nullable(txt(formData, 'reference'))
  const { data: corte } = await db.from('teacher_payouts').update({ status: 'pagado', paid_on: hoyMx(), reference: referencia })
    .eq('id', id).eq('status', 'pendiente').select('teacher_id, amount, period_start, period_end').maybeSingle()
  if (!corte) volver('/admin/liquidaciones', 'Ese corte ya estaba pagado.', 'error')
  const persona = await correoDe(db, corte.teacher_id)
  await avisar({
    para: persona?.email,
    asunto: 'Te enviamos tu pago de EAC Academia',
    titulo: 'Tu pago va en camino',
    parrafos: [
      `Te transferimos ${Number(corte.amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} por tus ventas del ${corte.period_start} al ${corte.period_end}.`,
      ...(referencia ? [`Referencia: ${referencia}`] : []),
    ],
    boton: 'Ver mis ganancias',
    enlace: `${await urlDelSitio()}/docente/ganancias`,
  })
  await audit(db, actor, 'pagar_corte', 'teacher_payout', id, { referencia })
  revalidatePath('/admin/liquidaciones')
  volver('/admin/liquidaciones', 'Corte marcado como pagado. Le avisamos por correo.')
}

export async function cambiarRol(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  const role = formData.get('role') === 'teacher' ? 'teacher' : 'student'
  const ruta = `/admin/estudiantes/${id}`
  const { data: p } = await db.from('profiles').select('role').eq('id', id).maybeSingle()
  if (!p || p.role === 'admin') volver(ruta, 'No se puede cambiar el rol de una cuenta de administración desde aquí.', 'error')
  await db.from('profiles').update({ role }).eq('id', id)
  if (role === 'teacher') await db.from('teacher_profiles').upsert({ profile_id: id }, { onConflict: 'profile_id', ignoreDuplicates: true })
  await audit(db, actor, 'cambiar_rol', 'profile', id, { role })
  revalidatePath(ruta)
  volver(ruta, role === 'teacher' ? 'Ahora tiene acceso al portal docente.' : 'Ya no tiene acceso al portal docente.')
}

// ---------------------------------------------------------------------
// Constancias e insignias
// ---------------------------------------------------------------------
export async function emitirConstanciaAdmin(formData) {
  const { profile: actor, db } = await requireAdmin()
  const profileId = Number(formData.get('profile_id'))
  const groupId = Number(formData.get('group_id'))
  const ruta = txt(formData, 'volver') || `/admin/estudiantes/${profileId}`
  const { constancia, nueva } = await emitirConstancia(db, { profileId, groupId, metodo: 'manual', emisorId: actor.id })
  await audit(db, actor, 'emitir_constancia', 'certificate', constancia.folio, { profileId, groupId })
  revalidatePath(ruta)
  volver(ruta, nueva ? `Constancia emitida con folio ${constancia.folio}.` : `Ya tenía constancia (folio ${constancia.folio}).`)
}

export async function revocarConstancia(formData) {
  const { profile: actor, db } = await requireAdmin()
  const folio = txt(formData, 'folio')
  const motivo = nullable(txt(formData, 'motivo'))
  await db.from('certificates').update({ revoked_at: new Date().toISOString(), revoked_reason: motivo }).eq('folio', folio).is('revoked_at', null)
  await audit(db, actor, 'revocar_constancia', 'certificate', folio, { motivo })
  revalidatePath('/admin/constancias')
  volver('/admin/constancias', `Constancia ${folio} cancelada. Ya no aparece como válida.`)
}

export async function actualizarNombreConstancia(formData) {
  const { profile: actor, db } = await requireAdmin()
  const folio = txt(formData, 'folio')
  const { data: c } = await db.from('certificates').select('profile_id').eq('folio', folio).maybeSingle()
  if (!c) volver('/admin/constancias', 'No encontramos esa constancia.', 'error')
  const { data: p } = await db.from('profiles').select('first_name, last_name, matricula').eq('id', c.profile_id).single()
  const nombre = [p.first_name, p.last_name].filter(Boolean).join(' ')
  await db.from('certificates').update({ full_name: nombre, matricula: p.matricula }).eq('folio', folio)
  await audit(db, actor, 'nombre_constancia', 'certificate', folio, { nombre })
  revalidatePath('/admin/constancias')
  volver(`/admin/constancias?q=${encodeURIComponent(folio)}`, `La constancia ahora dice «${nombre}».`)
}

export async function guardarFirma(formData) {
  const { profile: actor, db } = await requireAdmin()
  const ahora = new Date().toISOString()
  await db.from('settings').upsert([
    { key: 'constancia_firma_nombre', value: txt(formData, 'firma_nombre') || 'Dirección Académica', updated_at: ahora },
    { key: 'constancia_firma_cargo', value: txt(formData, 'firma_cargo') || 'EAC Academia', updated_at: ahora },
  ], { onConflict: 'key' })
  await audit(db, actor, 'firma_constancia', 'settings', 'constancia_firma')
  volver('/admin/constancias', 'Firma guardada. Aplica a todas las constancias que se descarguen desde ahora.')
}

export async function guardarRuta(formData) {
  const { profile: actor, db } = await requireAdmin()
  const idTxt = txt(formData, 'id')
  const color = /^#[0-9a-fA-F]{6}$/.test(txt(formData, 'color')) ? txt(formData, 'color') : '#6e3fc3'
  const datos = { title: txt(formData, 'title'), description: nullable(txt(formData, 'description')), color, is_active: formData.get('is_active') === 'on' }
  if (!datos.title) volver('/admin/constancias', 'Escribe el nombre de la ruta.', 'error')
  const cursos = formData.getAll('course_id').map(Number).filter(Boolean)
  if (cursos.length < 2) volver('/admin/constancias', 'Una ruta necesita al menos 2 cursos.', 'error')
  let id = Number(idTxt)
  if (id) {
    await db.from('learning_paths').update(datos).eq('id', id)
    await db.from('learning_path_courses').delete().eq('path_id', id)
  } else {
    const { data } = await db.from('learning_paths').insert(datos).select('id').single()
    id = data.id
  }
  await db.from('learning_path_courses').insert(cursos.map((course_id) => ({ path_id: id, course_id })))
  await audit(db, actor, idTxt ? 'editar_ruta' : 'crear_ruta', 'learning_path', id, { cursos })
  revalidatePath('/admin/constancias')
  volver('/admin/constancias', idTxt ? 'Ruta actualizada.' : 'Ruta creada. Ya aparece en «Mis logros» de cada estudiante.')
}

export async function eliminarRuta(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('id'))
  await db.from('learning_paths').delete().eq('id', id)
  await audit(db, actor, 'eliminar_ruta', 'learning_path', id)
  revalidatePath('/admin/constancias')
  volver('/admin/constancias', 'Ruta eliminada.')
}
