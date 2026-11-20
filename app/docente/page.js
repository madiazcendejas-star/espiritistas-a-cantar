import Link from 'next/link'
import Brand from '@/components/Brand'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Portal de docentes' }

// El portal de docentes (cursos, estudiantes, ventas, liquidaciones) se construye en la etapa del marketplace.
export default async function Docente() {
  const { profile } = await requireRole(['teacher', 'admin'], '/docente')
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <Brand />
      <div className="card" style={{ padding: 28, marginTop: 24 }}>
        <span className="eyebrow">Portal de docentes</span>
        <h1 style={{ fontWeight: 700, fontSize: 28, margin: '8px 0' }}>Hola{profile.first_name ? `, ${profile.first_name}` : ''}</h1>
        <p className="muted">Tu portal para crear cursos y ver tus ventas está en construcción.</p>
        <div style={{ marginTop: 18 }}><Link href="/mi-espacio" className="secondary">Ir a mi espacio de estudiante</Link></div>
      </div>
    </main>
  )
}
