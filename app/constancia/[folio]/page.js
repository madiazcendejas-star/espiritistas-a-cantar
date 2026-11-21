import Link from 'next/link'
import Brand from '@/components/Brand'
import Icon from '@/components/Icon'
import { createAdminClient } from '@/lib/supabase/admin'
import { fechaDia } from '@/lib/format'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Verificar constancia', robots: { index: false } }

// Verificación pública del folio impreso en cada constancia.
export default async function VerificarConstancia({ params }) {
  const { folio } = await params
  let c = null
  if (/^EAC-[A-Z0-9]{4,12}$/.test(folio)) {
    try {
      const { data } = await createAdminClient().from('certificates').select('folio, full_name, course_title, group_name, issued_on, revoked_at').eq('folio', folio).maybeSingle()
      c = data
    } catch {}
  }
  const valida = c && !c.revoked_at

  return (
    <div className="auth-form" style={{ minHeight: '100vh' }}>
      <div>
        <div style={{ marginBottom: 24 }}><Brand /></div>
        <span className="eyebrow">Verificación de constancia</span>
        {valida ? (
          <>
            <h1>Constancia válida</h1>
            <div className="notice info" style={{ margin: '14px 0 18px' }}><Icon name="check" /><span>EAC Academia emitió esta constancia.</span></div>
            <section className="card" style={{ padding: '6px 20px' }}>
              {[
                ['Folio', c.folio],
                ['Otorgada a', c.full_name],
                ['Curso', c.course_title],
                ...(c.group_name ? [['Grupo', c.group_name]] : []),
                ['Fecha', fechaDia(c.issued_on)],
              ].map(([k, v]) => (
                <div key={k} className="payout" style={{ margin: 0 }}><div><span>{k}</span><b>{v}</b></div></div>
              ))}
            </section>
          </>
        ) : (
          <>
            <h1>{c?.revoked_at ? 'Constancia cancelada' : 'No encontramos esta constancia'}</h1>
            <p className="sub">{c?.revoked_at ? 'Este folio existió pero fue cancelado por EAC Academia.' : `Revisa que el folio esté bien escrito (${folio}). Si tienes dudas, escríbenos.`}</p>
          </>
        )}
        <Link href="/" className="secondary" style={{ marginTop: 20 }}>Ir a EAC Academia</Link>
      </div>
    </div>
  )
}
