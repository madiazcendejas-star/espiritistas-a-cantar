import 'server-only'
import { Resend } from 'resend'

const REMITENTE = process.env.CORREO_REMITENTE || 'EAC Academia <contacto@espiritistasacantar.com>'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Correo de bienvenida después de una compra en línea.
export async function enviarCorreoCompra({ para, nombre, curso, grupo, cuentaNueva, enlace, cuotasPendientes }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY no configurada: no se envió el correo de compra')
    return
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const boton = cuentaNueva ? 'Crear mi contraseña' : 'Entrar a mi espacio'
  const pasos = cuentaNueva
    ? `<p style="margin:0 0 16px">Creamos tu cuenta con este correo. Solo falta que elijas tu contraseña para entrar a tus clases.</p>`
    : `<p style="margin:0 0 16px">El curso ya aparece en tu espacio. Entra con tu correo, teléfono o matrícula y tu contraseña de siempre.</p>`
  const cuotas = cuotasPendientes
    ? `<p style="margin:0 0 16px;color:#5b5670">Tus ${cuotasPendientes} pagos restantes aparecen en <b>Mis pagos</b>, con su fecha de vencimiento. Puedes pagarlos ahí mismo con tarjeta u OXXO.</p>`
    : ''

  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: [para],
    subject: `¡Ya tienes acceso a ${curso}!`,
    html: `
<div style="background:#f5f5f7;padding:32px 16px;font-family:Quicksand,Segoe UI,Arial,sans-serif;color:#2d193b">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e6ec;border-radius:20px;padding:32px">
    <p style="margin:0 0 4px;color:#6e3fc3;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase">EAC Academia</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#2d193b">¡Hola${nombre ? `, ${esc(nombre)}` : ''}!</h1>
    <p style="margin:0 0 16px">Recibimos tu pago. Ya tienes acceso a <b>${esc(curso)}</b>${grupo ? ` (${esc(grupo)})` : ''}.</p>
    ${pasos}
    ${cuotas}
    <p style="margin:24px 0"><a href="${esc(enlace)}" style="background:#6e3fc3;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;display:inline-block">${boton}</a></p>
    <p style="margin:0;color:#8a859b;font-size:13px">Si tienes cualquier duda, responde a este correo o escríbenos por WhatsApp.</p>
  </div>
  <p style="text-align:center;color:#a19cb2;font-size:12px;margin-top:16px">Espiritistas a Cantar · EAC Academia</p>
</div>`,
  })
  if (error) throw new Error(error.message || 'Resend rechazó el correo')
}

// Enlace para crear una contraseña nueva.
export async function enviarCorreoRecuperacion({ para, nombre, enlace }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: REMITENTE,
    to: [para],
    subject: 'Crea tu nueva contraseña de EAC Academia',
    html: `
<div style="background:#f5f5f7;padding:32px 16px;font-family:Quicksand,Segoe UI,Arial,sans-serif;color:#2d193b">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e6ec;border-radius:20px;padding:32px">
    <p style="margin:0 0 4px;color:#6e3fc3;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase">EAC Academia</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#2d193b">¡Hola${nombre ? `, ${esc(nombre)}` : ''}!</h1>
    <p style="margin:0 0 16px">Recibimos una solicitud para cambiar tu contraseña. Toca el botón para crear una nueva:</p>
    <p style="margin:24px 0"><a href="${esc(enlace)}" style="background:#6e3fc3;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;display:inline-block">Crear nueva contraseña</a></p>
    <p style="margin:0 0 8px;color:#5b5670">El enlace funciona durante 1 hora y solo una vez.</p>
    <p style="margin:0;color:#8a859b;font-size:13px">Si tú no lo pediste, ignora este correo: tu contraseña no cambia.</p>
  </div>
  <p style="text-align:center;color:#a19cb2;font-size:12px;margin-top:16px">Espiritistas a Cantar · EAC Academia</p>
</div>`,
  })
  if (error) throw new Error(error.message || 'Resend rechazó el correo')
}
