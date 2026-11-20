import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import PaymentRow from '@/components/PaymentRow'
import { getGruposParaSelect } from '@/components/GroupSelect'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { hoyMx, money } from '@/lib/format'

export const metadata = { title: 'Pagos' }

const FILTROS = [
  ['vencidas', 'Vencidas'],
  ['revision', 'En revisión'],
  ['proximas', 'Próximas 30 días'],
  ['pagados', 'Pagados recientes'],
]

export default async function Pagos({ searchParams }) {
  const sp = await searchParams
  const { db } = await requireAdmin()
  const filtro = FILTROS.some(([k]) => k === sp?.filtro) ? sp.filtro : 'vencidas'
  const hoy = hoyMx()
  const en30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

  let q = db.from('payments').select('*').limit(200)
  if (filtro === 'vencidas') q = q.eq('status', 'pendiente').lt('due_date', hoy).order('due_date', { ascending: true })
  if (filtro === 'revision') q = q.eq('status', 'en_revision').order('due_date', { ascending: true })
  if (filtro === 'proximas') q = q.eq('status', 'pendiente').gte('due_date', hoy).lte('due_date', en30).order('due_date', { ascending: true })
  if (filtro === 'pagados') q = q.eq('status', 'pagado').order('paid_on', { ascending: false, nullsFirst: false }).limit(60)
  const [{ data: pagos }, grupos] = await Promise.all([q, getGruposParaSelect(db)])

  const ids = [...new Set((pagos || []).map((p) => p.profile_id))]
  const { data: perfiles } = ids.length ? await db.from('profiles').select('id, matricula, first_name, last_name').in('id', ids) : { data: [] }
  const persona = (id) => (perfiles || []).find((x) => x.id === id)
  const curso = (gid) => grupos.find((g) => g.id === gid)?.course_title
  const total = (pagos || []).reduce((a, p) => a + Number(p.amount || 0), 0)
  const regreso = `/admin/pagos?filtro=${filtro}`

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Cobranza</span>
          <h1>Pagos</h1>
          <p>Registra pagos por transferencia o efectivo. Al confirmar una cuota vencida, el acceso se reactiva solo.</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />
      <div className="tabs">
        {FILTROS.map(([k, t]) => (
          <Link key={k} href={`/admin/pagos?filtro=${k}`} className={filtro === k ? 'active' : ''} style={{ padding: '12px 4px', marginRight: 18, fontWeight: 700, fontSize: 14, color: filtro === k ? 'var(--purple-dark)' : 'var(--muted)', borderBottom: `2px solid ${filtro === k ? 'var(--purple)' : 'transparent'}`, marginBottom: -1 }}>{t}</Link>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{(pagos || []).length} registros · {money(total)} MXN</p>
      <div className="stack">
        {(pagos || []).map((p) => {
          const per = persona(p.profile_id)
          return (
            <div key={p.id}>
              <div style={{ fontSize: 12, fontWeight: 700, margin: '0 4px 4px', display: 'flex', gap: 8 }}>
                <Link href={`/admin/estudiantes/${p.profile_id}`} style={{ color: 'var(--purple-dark)' }}>{per ? `${nombreCompleto(per)} · ${per.matricula}` : `Perfil ${p.profile_id}`}</Link>
              </div>
              <PaymentRow p={p} contexto={curso(p.group_id) || 'Pago'} regreso={regreso} />
            </div>
          )
        })}
        {!pagos?.length && <div className="card empty-card"><Icon name="check" size={26} /><b>Nada por aquí</b>No hay pagos en esta vista.</div>}
      </div>
    </main>
  )
}
