'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { pedirEnlace } from './actions'

export default function RecuperarForm() {
  const [state, action, pending] = useActionState(pedirEnlace, null)

  if (state?.enviado) {
    return (
      <div>
        <div className="notice info" style={{ marginBottom: 16 }}>
          <span>
            Si tu cuenta tiene un correo registrado, en unos minutos te llegará un enlace para crear tu nueva contraseña.
            Revisa también tu carpeta de <b>spam</b> o <b>promociones</b>.
          </span>
        </div>
        <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
          ¿No registraste correo o no te llega? Escríbenos por WhatsApp y te ayudamos a recuperarla.
        </p>
        <Link href="/entrar" className="primary full" style={{ minHeight: 50 }}>Volver a iniciar sesión</Link>
      </div>
    )
  }

  return (
    <form action={action}>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <div className="field">
        <label htmlFor="identificador">Teléfono, matrícula o correo</label>
        <input id="identificador" name="identificador" className="big" autoComplete="username" required />
      </div>
      <button className="primary full" type="submit" disabled={pending} style={{ minHeight: 50 }}>
        {pending ? 'Enviando…' : 'Enviarme el enlace'}
      </button>
    </form>
  )
}
