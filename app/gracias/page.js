import Link from 'next/link'
import { redirect } from 'next/navigation'
import Brand from '@/components/Brand'
import Icon from '@/components/Icon'
import CrearContrasenaForm from './CrearContrasenaForm'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionProfile } from '@/lib/auth'
import { getStripe, cumplirCheckout, perfilDeCheckout } from '@/lib/stripe'
import { money2 } from '@/lib/format'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Gracias por tu pago', robots: { index: false } }

function Marco({ eyebrow, titulo, children }) {
  return (
    <div className="auth-form" style={{ minHeight: '100vh' }}>
      <div>
        <div style={{ marginBottom: 24 }}><Brand /></div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{titulo}</h1>
        {children}
      </div>
    </div>
  )
}

export default async function Gracias({ searchParams }) {
  const { session_id: sessionId } = await searchParams
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) redirect('/')

  let session
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId)
  } catch (e) {
    console.error('Gracias: sesión de Stripe', e)
    return (
      <Marco eyebrow="Pago" titulo="No encontramos este pago">
        <p className="sub">Si ya pagaste, revisa tu correo o escríbenos por WhatsApp y lo revisamos contigo.</p>
        <Link href="/" className="primary full">Volver al inicio</Link>
      </Marco>
    )
  }

  const md = session.metadata || {}
  const tipo = md.tipo || (md.grupo_id ? 'inscripcion' : null)
  const esProducto = tipo === 'producto'

  // OXXO / SPEI: la ficha está generada pero falta que la persona pague.
  if (session.payment_status !== 'paid') {
    return (
      <Marco eyebrow="Casi listo" titulo="Tu ficha de pago está lista">
        <p className="sub">En cuanto Stripe confirme tu pago (en OXXO puede tardar hasta un día hábil), activaremos tu acceso y te avisaremos por correo{session.customer_details?.email ? ` a ${session.customer_details.email}` : ''}.</p>
        <div className="notice info" style={{ marginBottom: 16 }}><Icon name="info" /><span>Guarda la ficha o el número de referencia que te mostró Stripe. También te llegó por correo.</span></div>
        <Link href="/" className="secondary full">Volver al inicio</Link>
      </Marco>
    )
  }

  // Por si el webhook aún no llega: registramos aquí (no duplica nada).
  try {
    await cumplirCheckout(session)
  } catch (e) {
    console.error('Gracias: cumplirCheckout', e)
  }

  if (tipo === 'cuota') {
    return (
      <Marco eyebrow="Pago recibido" titulo="¡Gracias! Tu cuota quedó pagada">
        <p className="sub">Recibimos {money2((session.amount_total || 0) / 100)} MXN. Si tu acceso estaba en pausa, ya está activo de nuevo.</p>
        <Link href="/mi-espacio/pagos" className="primary full">Ver mis pagos</Link>
      </Marco>
    )
  }

  const db = createAdminClient()
  const perfil = await perfilDeCheckout(db, session).catch(() => null)
  const grupoUrl = esProducto ? '/mi-espacio/biblioteca' : md.grupo_id ? `/mi-espacio/grupo/${md.grupo_id}` : '/mi-espacio'

  if (!perfil) {
    return (
      <Marco eyebrow="Pago recibido" titulo="Estamos activando tu acceso">
        <p className="sub">Tu pago se recibió. Danos unos segundos y recarga esta página. Si no cambia, escríbenos por WhatsApp.</p>
        <a href={`/gracias?session_id=${sessionId}`} className="primary full">Recargar</a>
      </Marco>
    )
  }

  let pendiente = false
  let correoCuenta = perfil.email || ''
  if (perfil.auth_user_id) {
    const { data: u } = await db.auth.admin.getUserById(perfil.auth_user_id)
    pendiente = u?.user?.user_metadata?.contrasena_pendiente === sessionId
    correoCuenta = u?.user?.email || correoCuenta
  }

  if (pendiente) {
    return (
      <Marco eyebrow="Pago recibido" titulo={`¡Te damos la bienvenida${perfil.first_name && perfil.first_name !== 'Estudiante' ? `, ${perfil.first_name}` : ''}!`}>
        <p className="sub">Ya tienes acceso. Elige una contraseña para entrar {esProducto ? 'a tu biblioteca' : 'a tus clases'} desde cualquier dispositivo. Tu matrícula es <b>{perfil.matricula}</b>.</p>
        <CrearContrasenaForm sessionId={sessionId} email={correoCuenta} />
      </Marco>
    )
  }

  let conSesion = false
  try {
    conSesion = (await getSessionProfile()).profile?.id === perfil.id
  } catch {}

  return (
    <Marco eyebrow="Pago recibido" titulo="¡Listo! Ya tienes acceso">
      <p className="sub">{esProducto ? 'Tu material ya está en tu biblioteca' : 'El curso ya aparece en tu espacio'}{correoCuenta && !conSesion ? `. Entra con ${correoCuenta} y tu contraseña` : ''}.</p>
      <Link href={conSesion ? grupoUrl : `/entrar?siguiente=${encodeURIComponent(grupoUrl)}`} className="primary full">
        {conSesion ? (esProducto ? 'Ir a mi biblioteca' : 'Ir a mi curso') : 'Iniciar sesión'}
      </Link>
    </Marco>
  )
}
