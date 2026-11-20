import Icon from '@/components/Icon'
import { requireTeacher, porcentajeGeneral } from '@/lib/docente'
import { money2, fechaDia } from '@/lib/format'

export const metadata = { title: 'Ganancias' }

export default async function GananciasDocente() {
  const { profile, db } = await requireTeacher()
  const [{ data: filas }, { data: cortes }, pct] = await Promise.all([
    db.from('teacher_earnings').select('id, kind, gross, gateway_fee, share_pct, teacher_amount, eac_amount, earned_on, payout_id, courses(title)').eq('teacher_id', profile.id).order('earned_on', { ascending: false }).limit(300),
    db.from('teacher_payouts').select('*').eq('teacher_id', profile.id).order('period_end', { ascending: false }),
    porcentajeGeneral(db),
  ])
  const todas = filas || []
  const suma = (arr, k) => arr.reduce((a, f) => a + Number(f[k] || 0), 0)
  const pendiente = todas.filter((f) => !f.payout_id)
  const porPagar = (cortes || []).filter((c) => c.status === 'pendiente')
  const pagado = (cortes || []).filter((c) => c.status === 'pagado')

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Portal docente</span>
          <h1>Ganancias</h1>
          <p>Ventas de tus cursos propios, lo que te corresponde y tus pagos quincenales.</p>
        </div>
      </div>

      <div className="stats">
        <article className="stat"><div className="stat-icon"><Icon name="chart" /></div><div><span>Ventas totales</span><strong>{money2(suma(todas, 'gross'))}</strong><small style={{ color: 'var(--muted)' }}>{todas.filter((f) => f.kind === 'venta').length} pagos</small></div></article>
        <article className="stat"><div className="stat-icon"><Icon name="shield" /></div><div><span>Comisión EAC y pasarela</span><strong>{money2(suma(todas, 'eac_amount') + suma(todas, 'gateway_fee'))}</strong><small style={{ color: 'var(--muted)' }}>tu parte general: {pct} %</small></div></article>
        <article className="stat"><div className="stat-icon"><Icon name="wallet" /></div><div><span>Acumulado sin corte</span><strong>{money2(suma(pendiente, 'teacher_amount'))}</strong><small style={{ color: 'var(--muted)' }}>entra en el siguiente corte</small></div></article>
        <article className="stat"><div className="stat-icon"><Icon name="check" /></div><div><span>Ya pagado</span><strong>{money2(suma(pagado, 'amount'))}</strong><small style={{ color: 'var(--muted)' }}>{porPagar.length ? `${money2(suma(porPagar, 'amount'))} en camino` : 'al corriente'}</small></div></article>
      </div>

      <div className="notice info" style={{ marginBottom: 8 }}>
        <Icon name="info" />
        <span>Tu ganancia por pago = (monto − comisión de la pasarela) × tu porcentaje. Hacemos un corte cada quincena (días 1–15 y 16–fin de mes) y te transferimos a la cuenta de tu perfil docente.</span>
      </div>

      {(cortes || []).length > 0 && (
        <>
          <div className="section-head"><div><span className="eyebrow">Cortes</span><h2>Pagos quincenales</h2></div></div>
          <section className="table-panel">
            <div className="table-row table-header" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr' }}><span>Periodo</span><span className="right">Monto</span><span>Estado</span><span>Referencia</span></div>
            {cortes.map((c) => (
              <div key={c.id} className="table-row" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr' }}>
                <span>{fechaDia(c.period_start)} – {fechaDia(c.period_end)}</span>
                <span className="right"><b>{money2(c.amount)}</b></span>
                <span><i className={`status ${c.status === 'pagado' ? 'success' : 'review'}`}>{c.status === 'pagado' ? `Pagado ${fechaDia(c.paid_on)}` : 'Por transferir'}</i></span>
                <span className="muted">{c.reference || '—'}</span>
              </div>
            ))}
          </section>
        </>
      )}

      <div className="section-head"><div><span className="eyebrow">Detalle</span><h2>Pagos de tus cursos</h2></div></div>
      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '1fr 1.8fr 1fr 1fr .7fr 1fr' }}><span>Fecha</span><span>Curso</span><span className="right">Pago</span><span className="right">Pasarela</span><span className="right">%</span><span className="right">Tu parte</span></div>
        {todas.map((f) => (
          <div key={f.id} className="table-row" style={{ gridTemplateColumns: '1fr 1.8fr 1fr 1fr .7fr 1fr' }}>
            <span>{fechaDia(f.earned_on)}</span>
            <span>{f.courses?.title}{f.kind === 'reverso' && <small style={{ display: 'block', color: 'var(--rose)' }}>Pago cancelado (se descuenta)</small>}</span>
            <span className="right">{money2(f.gross)}</span>
            <span className="right muted">{money2(f.gateway_fee)}</span>
            <span className="right">{Number(f.share_pct)}</span>
            <span className="right"><b style={{ color: Number(f.teacher_amount) < 0 ? 'var(--rose)' : undefined }}>{money2(f.teacher_amount)}</b></span>
          </div>
        ))}
        {!todas.length && <div className="empty-card" style={{ padding: 22 }}>Aquí aparecerán los pagos de tus cursos propios en cuanto se publiquen y reciban inscripciones.</div>}
      </section>
    </main>
  )
}
