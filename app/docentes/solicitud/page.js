import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import Icon from '@/components/Icon'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Solicitud de docente' }

// El registro y la revisión de docentes llegan en la etapa del marketplace.
export default function SolicitudDocente() {
  return (
    <>
      <PublicHeader active="docente" />
      <main className="pub-main" style={{ paddingTop: 40, maxWidth: 720 }}>
        <Link href="/docentes" className="back-home"><Icon name="chevron" size={16} /> Enseña en EAC</Link>
        <div className="card" style={{ padding: 28 }}>
          <span className="eyebrow">Muy pronto</span>
          <h1 style={{ fontWeight: 700, fontSize: 28, margin: '8px 0', color: 'var(--ink-2)' }}>Registro de docentes</h1>
          <p className="muted">
            Estamos preparando el portal para docentes aliados. Muy pronto podrás crear tu cuenta y enviar tu
            propuesta de curso desde aquí.
          </p>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
