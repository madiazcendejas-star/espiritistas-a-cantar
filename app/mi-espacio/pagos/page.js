import Icon from '@/components/Icon'
import { getSessionProfile } from '@/lib/auth'
import { getMisGrupos, getPagos } from '@/lib/student'
import { money, fechaDia } from '@/lib/format'
import { pagarCuota } from './actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { ajustes } from '@/lib/ajustes'
import { waMe } from '@/lib/ligaPago'

export const metadata = { title: 'Mis pagos' }

const ESTADO = {
  pagado: ['success', 'Pagado'],
  pendiente: ['review', 'Pendiente'],
  en_revision: ['info', 'En revisión'],
  cancelado: ['neutral', 'Cancelado'],
}

export default async function Pagos({ searchParams }) {
  const { error } = await searchParams
  let ayuda = null
  let tolerancia = 3
  try {
    const { profile } = await getSessionProfile()
    const { whatsapp_ayuda, dias_tolerancia } = await ajustes(createAdminClient(), ['whatsapp_ayuda', 'dias_tolerancia'])
    if (Number.isFinite(Number(dias_tolerancia))) tolerancia = Number(dias_tolerancia)
    ayuda = waMe(whatsapp_ayuda, `Hola, soy ${profile?.first_name || ''} (matrícula ${profile?.matricula || ''}). Tengo una duda sobre mis pagos.`)
  } catch {}
  const { supabase, profile: yo } = await getSessionProfile()
  const [pagos, grupos] = await Promise.all([getPagos(supabase, yo?.id), getMisGrupos(supabase)])
  const curso = (p) => grupos.find((g) => g.group_id === p.group_id)?.curso.title || 'Curso'
  const pendientes = pagos.filter((p) => p.status === 'pendiente')
  const vencidos = pendientes.filter((p) => p.vencido)
  const historial = pagos.filter((p) => p.status !== 'pendiente').reverse()
  const totalPendiente = pendientes.reduce((a, p) => a + Number(p.amount || 0), 0)

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Pagos y cuotas</span>
          <h1>Mis pagos</h1>
          <p>Consulta tus cuotas pendientes y tu historial de pagos.</p>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <article className="stat"><div className="stat-icon"><Icon name="wallet" /></div><div><span>Por pagar</span><strong>{money(totalPendiente)}</strong><small style={{ color: 'var(--muted)' }}>{pendientes.length} cuota{pendientes.length === 1 ? '' : 's'}</small></div></article>
        <article className="stat"><div className="stat-icon" style={vencidos.length ? { background: 'var(--rose-soft)', color: 'var(--rose)' } : undefined}><Icon name="clock" /></div><div><span>Vencidas</span><strong>{vencidos.length}</strong><small style={{ color: vencidos.length ? 'var(--rose)' : 'var(--green)' }}>{vencidos.length ? 'Acceso pausado' : 'Al corriente'}</small></div></article>
        <article className="stat"><div className="stat-icon"><Icon name="check" /></div><div><span>Pagadas</span><strong>{pagos.filter((p) => p.status === 'pagado').length}</strong><small style={{ color: 'var(--muted)' }}>Historial completo abajo</small></div></article>
      </div>

      {error && <div className="notice danger" role="alert" style={{ marginBottom: 8 }}><Icon name="info" /><span>{error}</span></div>}
      {vencidos.length > 0 && (
        <div className="notice warn" style={{ marginBottom: 8 }}>
          <Icon name="info" />
          <span>Tienes {vencidos.length === 1 ? 'una cuota vencida' : `${vencidos.length} cuotas vencidas`}. {tolerancia > 0 ? `Tu acceso se pausa ${tolerancia} día${tolerancia === 1 ? '' : 's'} después del vencimiento; ` : ''}al pagar, se reactiva en automático.</span>
        </div>
      )}

      <div className="section-head"><div><span className="eyebrow">Por pagar</span><h2>Cuotas pendientes</h2></div></div>
      {pendientes.length ? (
        <section className="table-panel cuotas-panel">
          <div className="table-row table-header" style={{ gridTemplateColumns: '1.6fr 1fr 1fr .9fr auto' }}><span>Curso</span><span>Vencimiento</span><span className="right">Monto</span><span>Estado</span><span /></div>
          {pendientes.map((p) => (
            <div key={p.id} className="table-row cuota-row" style={{ gridTemplateColumns: '1.6fr 1fr 1fr .9fr auto' }}>
              <span><b>{curso(p)}</b></span>
              <span style={{ color: p.vencido ? 'var(--rose)' : undefined, fontWeight: p.vencido ? 700 : 500 }}>{p.due_date ? fechaDia(p.due_date) : 'Sin fecha'}</span>
              <span className="right"><b>{money(p.amount)}</b></span>
              <span><i className={`status ${p.vencido ? 'danger' : 'review'}`}>{p.vencido ? 'Vencida' : 'Pendiente'}</i></span>
              <form action={pagarCuota} className="cuota-pagar">
                <input type="hidden" name="payment_id" value={p.id} />
                <button type="submit" className="primary"><Icon name="card" size={16} /> Pagar</button>
              </form>
            </div>
          ))}
        </section>
      ) : (
        <div className="card empty-card" style={{ padding: 24 }}><Icon name="check" size={26} /><b>Estás al corriente</b>No tienes cuotas pendientes.</div>
      )}
      {ayuda && (
        <div className="ayuda-pagos">
          <span>¿Prefieres pagar por transferencia o tienes alguna duda?</span>
          <a href={ayuda} target="_blank" rel="noopener noreferrer" className="secondary sm"><Icon name="message" size={16} /> Escríbenos por WhatsApp</a>
        </div>
      )}

      {historial.length > 0 && (
        <>
          <div className="section-head"><div><span className="eyebrow">Historial</span><h2>Pagos anteriores</h2></div></div>
          <section className="table-panel">
            <div className="table-row table-header" style={{ gridTemplateColumns: '1.6fr 1fr 1fr .9fr' }}><span>Curso</span><span>Fecha</span><span className="right">Monto</span><span>Estado</span></div>
            {historial.map((p) => {
              const [tono, texto] = ESTADO[p.status] || ['neutral', p.status]
              return (
                <div key={p.id} className="table-row" style={{ gridTemplateColumns: '1.6fr 1fr 1fr .9fr' }}>
                  <span><b>{curso(p)}</b></span>
                  <span>{fechaDia(p.paid_on || p.due_date) || '—'}</span>
                  <span className="right">{money(p.amount)}</span>
                  <span><i className={`status ${tono}`}>{texto}</i></span>
                </div>
              )
            })}
          </section>
        </>
      )}
    </main>
  )
}
