'use client'

import { useActionState } from 'react'
import { cambiarContrasena } from '../actions'

export default function NuevaContrasenaForm() {
  const [state, action, pending] = useActionState(cambiarContrasena, null)
  return (
    <form action={action}>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <div className="field">
        <label htmlFor="nueva">Contraseña nueva</label>
        <input id="nueva" name="nueva" type="password" className="big" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="confirmar">Repite la contraseña</label>
        <input id="confirmar" name="confirmar" type="password" className="big" autoComplete="new-password" minLength={8} required />
      </div>
      <button className="primary full" type="submit" disabled={pending} style={{ minHeight: 50 }}>
        {pending ? 'Guardando…' : 'Guardar y entrar'}
      </button>
    </form>
  )
}
