import Link from 'next/link'
import Brand from '@/components/Brand'

export default function NotFound() {
  return (
    <main className="auth-form" style={{ minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><Brand /></div>
        <span className="eyebrow">Página no encontrada</span>
        <h1>No encontramos lo que buscas</h1>
        <p className="sub">Puede que el enlace haya cambiado.</p>
        <Link href="/" className="primary">Volver al inicio</Link>
      </div>
    </main>
  )
}
