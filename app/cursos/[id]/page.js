import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import Icon from '@/components/Icon'
import { getCourse } from '@/lib/catalog'
import { money, fechaDia, MODALIDAD } from '@/lib/format'

export const dynamic = 'force-dynamic'


export async function generateMetadata({ params }) {
  const { id } = await params
  const c = /^\d+$/.test(id) ? await getCourse(id).catch(() => null) : null
  return { title: c?.title || 'Curso', description: c?.description?.slice(0, 160) }
}

function describeGrupo(g) {
  const partes = [MODALIDAD[g.modality] || g.modality]
  if (g.schedule_text) partes.push(g.schedule_text)
  if (g.starts_on) partes.push(`inicia el ${fechaDia(g.starts_on)}`)
  return partes.join(' · ')
}

function describePago(g) {
  const total = Number(g.price_total) || 0
  if (!total) return 'Consulta el precio'
  if (g.installments > 1) {
    return `${money(total)} MXN en ${g.installments} pagos de ${money(total / g.installments)}`
  }
  return `${money(total)} MXN en un solo pago`
}

export default async function CursoDetalle({ params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  const curso = await getCourse(id).catch(() => null)
  if (!curso) notFound()

  return (
    <>
      <PublicHeader active="estudiante" />
      <main className="pub-main">
        <div className="detail">
          <div>
            <Link href="/cursos" className="back-home" style={{ marginBottom: 16 }}><Icon name="chevron" size={16} /> Todos los cursos</Link>
            <div className="cover-lg">
              {curso.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={curso.cover_url} alt="" />
              ) : (
                <span>✦</span>
              )}
            </div>
            <div style={{ marginTop: 24 }}>
              <div className="chips">
                {curso.is_upcoming && <span className="chip gold">Próximamente</span>}
                {curso.modalidades.map((m) => <span key={m} className="chip">{MODALIDAD[m] || m}</span>)}
                {curso.duration_text && <span className="chip">{curso.duration_text}</span>}
              </div>
              <h1 style={{ fontWeight: 700, fontSize: 'clamp(28px,3vw,40px)', color: 'var(--ink-2)', margin: '12px 0' }}>{curso.title}</h1>
              {curso.description && <p className="prose">{curso.description}</p>}
              {curso.what_you_learn && (
                <>
                  <div className="section-head" style={{ marginTop: 28 }}><div><span className="eyebrow">Temario</span><h2>Lo que aprenderás</h2></div></div>
                  <p className="prose">{curso.what_you_learn}</p>
                </>
              )}
            </div>
          </div>

          <aside className="card sticky-card">
            <span className="eyebrow">Inscripción</span>
            <h2 style={{ fontWeight: 700, fontSize: 20, margin: '6px 0 14px' }}>Elige fecha y modalidad</h2>
            {curso.groups.length ? (
              <form>
                {curso.groups.map((g, i) => (
                  <label key={g.id} className="option">
                    <input type="radio" name="grupo" value={g.id} defaultChecked={i === 0} />
                    <span>
                      <b>{g.name}</b>
                      <small>{describeGrupo(g)}</small>
                      <small style={{ color: 'var(--ink)', fontWeight: 700, marginTop: 4 }}>{describePago(g)}</small>
                    </span>
                  </label>
                ))}
                <button type="button" className="primary full" style={{ marginTop: 16 }} disabled title="Disponible al conectar Stripe (Fase 3)">
                  <Icon name="card" size={18} /> Inscribirme
                </button>
                <p className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                  Tarjeta, SPEI u OXXO. La inscripción en línea se habilita muy pronto.
                </p>
              </form>
            ) : (
              <div className="notice info"><Icon name="info" /><span>Por ahora no hay fechas abiertas para este curso. Muy pronto publicaremos nuevas.</span></div>
            )}
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 18, paddingTop: 14, fontSize: 13 }} className="muted">
              ¿Ya estás inscrito? <Link href="/entrar" style={{ color: 'var(--purple)', fontWeight: 700 }}>Inicia sesión</Link>
            </div>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
