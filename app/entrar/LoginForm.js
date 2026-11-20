'use client'

import { useActionState, useState } from 'react'
import { iniciarSesion } from './actions'
import Icon from '@/components/Icon'

export default function LoginForm({ siguiente }) {
  const [state, action, pending] = useActionState(iniciarSesion, null)
  const [ver, setVer] = useState(false)
  return (
    <form action={action}>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <input type="hidden" name="siguiente" value={siguiente || ''} />
      <div className="field">
        <label htmlFor="identificador">Teléfono, matrícula o correo</label>
        <input
          id="identificador"
          name="identificador"
          className="big"
          autoComplete="username"
          inputMode="email"
          placeholder="Ej. 3312345678"
          defaultValue={state?.identificador || ''}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            name="password"
            className="big"
            type={ver ? 'text' : 'password'}
            autoComplete="current-password"
            required
            style={{ paddingRight: 90 }}
          />
          <button
            type="button"
            className="ghost sm"
            onClick={() => setVer(!ver)}
            style={{ position: 'absolute', right: 6, top: 8 }}
            aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {ver ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
      <button className="primary full" type="submit" disabled={pending} style={{ minHeight: 50, fontSize: 15 }}>
        {pending ? 'Entrando…' : <><Icon name="user" size={18} /> Entrar</>}
      </button>
    </form>
  )
}
