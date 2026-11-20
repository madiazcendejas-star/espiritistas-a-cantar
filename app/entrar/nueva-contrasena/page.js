import { redirect } from 'next/navigation'
import Brand from '@/components/Brand'
import NuevaContrasenaForm from './NuevaContrasenaForm'
import { getSessionProfile } from '@/lib/auth'

export const metadata = { title: 'Crea una contraseña nueva' }

export default async function NuevaContrasena() {
  const { user } = await getSessionProfile()
  if (!user) redirect('/entrar')
  return (
    <div className="auth-form" style={{ minHeight: '100vh' }}>
      <div>
        <div style={{ marginBottom: 24 }}><Brand /></div>
        <span className="eyebrow">Un paso más</span>
        <h1>Crea una contraseña nueva</h1>
        <p className="sub">Por tu seguridad, tu contraseña debe tener al menos 8 caracteres. Solo te lo pediremos esta vez.</p>
        <NuevaContrasenaForm />
      </div>
    </div>
  )
}
