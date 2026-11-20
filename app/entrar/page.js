import Link from 'next/link'
import { redirect } from 'next/navigation'
import Brand from '@/components/Brand'
import Icon from '@/components/Icon'
import LoginForm from './LoginForm'
import { getSessionProfile, PANEL_POR_ROL, rutaSegura } from '@/lib/auth'

export const metadata = { title: 'Iniciar sesión' }

export default async function Entrar({ searchParams }) {
  const sp = await searchParams
  const siguiente = rutaSegura(sp?.siguiente, '')
  const { profile } = await getSessionProfile().catch(() => ({ profile: null }))
  if (profile) redirect(siguiente || PANEL_POR_ROL[profile.role] || '/mi-espacio')

  return (
    <div className="auth">
      <div className="auth-art">
        <div className="moon" />
        <div style={{ position: 'relative' }}>
          <div className="brand" style={{ color: '#fff' }}>
            <div className="brand-mark">EAC</div>
            <div><strong>EAC</strong><span>academia</span></div>
          </div>
        </div>
        <div>
          <h2>Tu espacio de aprendizaje, en un solo lugar.</h2>
          <p>Clases en vivo, grabaciones, materiales y tus pagos, desde tu celular o tu computadora.</p>
        </div>
        <small style={{ color: '#b9a6c8', position: 'relative' }}>© EAC Academia · Antes Espiritistas a Cantar</small>
      </div>
      <div className="auth-form">
        <div>
          <Link href="/" className="back-home"><Icon name="chevron" size={16} /> Volver al inicio</Link>
          <div className="mobile-only" style={{ marginBottom: 18 }}><Brand /></div>
          <span className="eyebrow">Iniciar sesión</span>
          <h1>Te damos la bienvenida</h1>
          <p className="sub">Entra con el mismo teléfono, matrícula o correo y la misma contraseña que ya usas.</p>
          {sp?.error === 'perfil' && (
            <div className="form-error">Tu cuenta no tiene un perfil asignado. Escríbenos para ayudarte.</div>
          )}
          <LoginForm siguiente={siguiente} />
          <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>
            ¿Olvidaste tu contraseña? Escríbenos y te ayudamos a recuperarla.
          </p>
        </div>
      </div>
    </div>
  )
}
