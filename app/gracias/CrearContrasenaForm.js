'use client'

import { useActionState } from 'react'
import { crearContrasenaCompra } from './actions'

export default function CrearContrasenaForm({ sessionId, email }) {
  const [state, action, pending] = useActionState(crearContrasenaCompra, null)
  return (
    <form action={action}>
      <input type="hidden" name="session_id" value={sessionId} />
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <div className="field">
        <label htmlFor="correo">Tu correo (con él entrarás)</label>
        <input id="correo" type="email" className="big" value={email} readOnly autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="nueva">Elige tu contraseña</label>
        <input id="nueva" name="nueva" type="password" className="big" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="confirmar">Repite la contraseña</label>
        <input id="confirmar" name="confirmar" type="password" className="big" autoComplete="new-password" minLength={8} required />
      </div>
      <button className="primary full" type="submit" disabled={pending} style={{ minHeight: 50 }}>
        {pending ? 'Guardando…' : 'Guardar y entrar a mi curso'}
      </button>
    </form>
  )
}
