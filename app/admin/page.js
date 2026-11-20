import Link from 'next/link'
import Brand from '@/components/Brand'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Administración', robots: { index: false, follow: false } }

// /admin no aparece en el menú público. Requiere sesión y rol de administración.
// El panel completo (accesos, cursos, marketplace, finanzas) es la siguiente entrega de la Fase 2.
export default async function Admin() {
  const { profile } = await requireRole(['admin'], '/admin')
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <Brand />
      <div className="card" style={{ padding: 28, marginTop: 24 }}>
        <span className="eyebrow">Administración EAC</span>
        <h1 style={{ fontWeight: 700, fontSize: 28, margin: '8px 0' }}>Panel general</h1>
        <p className="muted">Sesión iniciada como {profile.first_name || 'administración'}. El panel de administración llega en la siguiente entrega.</p>
        <div style={{ marginTop: 18 }}><Link href="/" className="secondary">Ir al sitio</Link></div>
      </div>
    </main>
  )
}
