import Link from 'next/link'
import Brand from '@/components/Brand'
import Icon from '@/components/Icon'
import RecuperarForm from './RecuperarForm'

export const metadata = { title: 'Recuperar contraseña' }

export default async function Recuperar({ searchParams }) {
  const { error } = await searchParams
  return (
    <div className="auth-form" style={{ minHeight: '100vh' }}>
      <div>
        <Link href="/entrar" className="back-home"><Icon name="chevron" size={16} /> Volver a iniciar sesión</Link>
        <div style={{ marginBottom: 24 }}><Brand /></div>
        <span className="eyebrow">Recuperar contraseña</span>
        <h1>¿Olvidaste tu contraseña?</h1>
        <p className="sub">Escribe el teléfono, matrícula o correo con el que entras y te enviaremos un enlace a tu correo para crear una nueva.</p>
        {error === 'expirado' && (
          <div className="form-error" role="alert">Ese enlace ya se usó o expiró. Pide uno nuevo aquí.</div>
        )}
        <RecuperarForm />
      </div>
    </div>
  )
}
