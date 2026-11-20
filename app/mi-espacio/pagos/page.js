import Icon from '@/components/Icon'
import { getSessionProfile } from '@/lib/auth'
import { getMisGrupos, getPagos } from '@/lib/student'
import { money, fechaDia } from '@/lib/format'

export const metadata = { title: 'Mis pagos' }

const ESTADO = {
  pagado: ['success', 'Pagado'],
  pendiente: ['review', 'Pendiente'],
  en_revision: ['info', 'En revisión'],
  cancelado: ['neutral', 'Cancelado'],
}

export default async function Pagos() {
  const { supabase } = await getSessionProfile()
  const [pagos, grupos] = await Promise.all([getPagos(supabase), getMisGrupos(supabase)])
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

      <div className="notice info" style={{ marginBottom: 8 }}>
        <Icon name="info" />
        <span>Muy pronto podrás pagar tus cuotas aquí mismo con tarjeta, SPEI u OXXO. Mientras tanto, sigue pagando como lo haces hoy y tu cuota se registrará en esta lista.</span>
      </div>

      <div className="section-head"><div><span className="eyebrow">Por pagar</span><h2>Cuotas pendientes</h2></div></div>
      {pendientes.length ? (
        <section className="table-panel">
          <div className="table-row table-header" style={{ gridTemplateColumns: '1.6fr 1fr 1fr .9fr' }}><span>Curso</span><span>Vencimiento</span><span className="right">Monto</span><span>Estado</span></div>
          {pendientes.map((p) => (
            <div key={p.id} className="table-row" style={{ gridTemplateColumns: '1.6fr 1fr 1fr .9fr' }}>
              <span><b>{curso(p)}</b></span>
              <span style={{ color: p.vencido ? 'var(--rose)' : undefined, fontWeight: p.vencido ? 700 : 500 }}>{p.due_date ? fechaDia(p.due_date) : 'Sin fecha'}</span>
              <span className="right"><b>{money(p.amount)}</b></span>
              <span><i className={`status ${p.vencido ? 'danger' : 'review'}`}>{p.vencido ? 'Vencida' : 'Pendiente'}</i></span>
            </div>
          ))}
        </section>
      ) : (
        <div className="card empty-card" style={{ padding: 24 }}><Icon name="check" size={26} /><b>Estás al corriente</b>No tienes cuotas pendientes.</div>
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
