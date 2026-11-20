import { redirect } from 'next/navigation'
import Brand from '@/components/Brand'
import { validarEnlace } from './actions'

export const metadata = { title: 'Crear nueva contraseña', robots: { index: false } }

export default async function Restablecer({ searchParams }) {
  const { t } = await searchParams
  if (!t) redirect('/entrar/recuperar')
  return (
    <div className="auth-form" style={{ minHeight: '100vh' }}>
      <div>
        <div style={{ marginBottom: 24 }}><Brand /></div>
        <span className="eyebrow">Recuperar contraseña</span>
        <h1>Crea tu nueva contraseña</h1>
        <p className="sub">Toca el botón para continuar.</p>
        <form action={validarEnlace}>
          <input type="hidden" name="t" value={t} />
          <button className="primary full" type="submit" style={{ minHeight: 50 }}>Continuar</button>
        </form>
      </div>
    </div>
  )
}
