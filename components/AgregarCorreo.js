'use client'

import { useActionState } from 'react'
import Icon from './Icon'
import { agregarCorreo } from '@/app/mi-espacio/correo/actions'

// Aviso para quien entra sin correo: lo agrega y lo confirma desde su bandeja.
export default function AgregarCorreo({ pendiente }) {
  const [state, action, pending] = useActionState(agregarCorreo, null)
  const enviadoA = state?.enviado ? state.email : pendiente

  return (
    <section className="card correo-card">
      <div className="correo-head">
        <div className="stat-icon"><Icon name="mail" /></div>
        <div>
          <b>{enviadoA ? 'Revisa tu correo' : 'Agrega tu correo'}</b>
          <p>
            {enviadoA
              ? <>Te enviamos un enlace a <b>{enviadoA}</b>. Tócalo para confirmarlo (revisa también spam). ¿Te equivocaste o no llegó? Escríbelo de nuevo abajo.</>
              : 'Así podrás recuperar tu contraseña por tu cuenta si algún día la olvidas, y entrar también con tu correo.'}
          </p>
        </div>
      </div>
      <form action={action} className="correo-form">
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tucorreo@gmail.com"
          defaultValue={state?.email && !state?.enviado ? state.email : ''}
          aria-label="Tu correo"
          required
        />
        <button className="primary" type="submit" disabled={pending}>{pending ? 'Enviando…' : enviadoA ? 'Enviar de nuevo' : 'Guardar correo'}</button>
      </form>
      {state?.error && <div className="form-error" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>{state.error}</div>}
    </section>
  )
}
