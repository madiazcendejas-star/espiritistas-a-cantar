'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { enviarSolicitud } from './actions'

export default function SolicitudForm({ conSesion, nombre }) {
  const [state, action, pending] = useActionState(enviarSolicitud, null)
  const v = state?.valores || {}

  if (state?.listo) {
    return (
      <div className="card" style={{ padding: 28 }}>
        <span className="eyebrow">{state.yaDocente ? 'Ya eres docente' : 'Solicitud enviada'}</span>
        <h2 style={{ fontWeight: 700, fontSize: 24, margin: '8px 0' }}>{state.yaDocente ? 'Tu portal ya está activo' : '¡Gracias! Recibimos tu solicitud'}</h2>
        <p className="muted">{state.yaDocente ? 'Entra a tu portal para proponer cursos.' : 'La revisaremos y te escribiremos a tu correo. En cuanto la aprobemos, podrás entrar a tu portal docente para proponer tu curso.'}</p>
        <Link href={state.yaDocente ? '/docente' : '/'} className="primary">{state.yaDocente ? 'Ir a mi portal' : 'Volver al inicio'}</Link>
      </div>
    )
  }

  return (
    <form action={action} className="card" style={{ padding: 24 }}>
      {state?.error && (
        <div className="form-error" role="alert">
          {state.error}{state.entrar && <> <Link href="/entrar?siguiente=/docentes/solicitud" style={{ fontWeight: 700, textDecoration: 'underline' }}>Iniciar sesión</Link></>}
        </div>
      )}

      {conSesion ? (
        <p className="muted" style={{ marginTop: 0 }}>Enviarás la solicitud con tu cuenta{nombre ? ` (${nombre})` : ''}.</p>
      ) : (
        <>
          <span className="eyebrow">Tu cuenta</span>
          <div className="grid2" style={{ marginTop: 10 }}>
            <div className="field"><label>Nombre</label><input name="first_name" defaultValue={v.first_name} required autoComplete="given-name" /></div>
            <div className="field"><label>Apellidos</label><input name="last_name" defaultValue={v.last_name} autoComplete="family-name" /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>Correo</label><input name="email" type="email" defaultValue={v.email} required autoComplete="email" /></div>
            <div className="field"><label>Teléfono (WhatsApp)</label><input name="phone" type="tel" defaultValue={v.phone} autoComplete="tel" /></div>
          </div>
          <div className="field"><label>Crea una contraseña</label><input name="password" type="password" minLength={8} required autoComplete="new-password" /></div>
          <p className="muted" style={{ fontSize: 13 }}>¿Ya tienes cuenta en EAC? <Link href="/entrar?siguiente=/docentes/solicitud" style={{ color: 'var(--purple)', fontWeight: 700 }}>Inicia sesión</Link> y vuelve aquí.</p>
          <div style={{ borderTop: '1px solid var(--line)', margin: '18px 0' }} />
        </>
      )}

      <span className="eyebrow">Tu propuesta</span>
      <div className="field" style={{ marginTop: 10 }}><label>Especialidad</label><input name="specialty" defaultValue={v.specialty} required placeholder="Ej. Tarot, herbolaria, sanación energética" /></div>
      <div className="field"><label>Tu experiencia</label><textarea name="bio" rows={4} defaultValue={v.bio} required placeholder="¿Desde cuándo practicas y enseñas? ¿Cuántas personas han tomado tus cursos?" /></div>
      <div className="field"><label>¿Qué curso te gustaría impartir?</label><textarea name="proposal" rows={4} defaultValue={v.proposal} required placeholder="Nombre tentativo, temas, modalidad (en vivo o grabado) y precio aproximado" /></div>
      <div className="field"><label>Enlace a tu trabajo (opcional)</label><input name="sample_url" type="url" defaultValue={v.sample_url} placeholder="Instagram, YouTube, tu sitio…" /></div>
      <button className="primary full" type="submit" disabled={pending} style={{ minHeight: 50 }}>{pending ? 'Enviando…' : 'Enviar solicitud'}</button>
    </form>
  )
}
