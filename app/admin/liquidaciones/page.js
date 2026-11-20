import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { quincenaAnterior, porcentajeGeneral } from '@/lib/docente'
import { money2, fechaDia, hoyMx } from '@/lib/format'
import { guardarPorcentaje, generarCorte, marcarCortePagado } from '../actions'

export const metadata = { title: 'Liquidaciones' }

export default async function Liquidaciones({ searchParams }) {
  const sp = await searchParams
  const { db } = await requireAdmin()
  const periodo = quincenaAnterior(hoyMx())
  const [{ data: pendientes }, { data: cortes }, pct] = await Promise.all([
    db.from('teacher_earnings').select('teacher_id, gross, teacher_amount, eac_amount, gateway_fee, earned_on').is('payout_id', null),
    db.from('teacher_payouts').select('*').order('created_at', { ascending: false }).limit(60),
    porcentajeGeneral(db),
  ])
  const idsDocentes = [...new Set([...(pendientes || []).map((p) => p.teacher_id), ...(cortes || []).map((c) => c.teacher_id)])]
  const [{ data: personas }, { data: perfilesDoc }] = idsDocentes.length
    ? await Promise.all([
        db.from('profiles').select('id, first_name, last_name').in('id', idsDocentes),
        db.from('teacher_profiles').select('profile_id, payout_info').in('profile_id', idsDocentes),
      ])
    : [{ data: [] }, { data: [] }]
  const nombre = (id) => nombreCompleto((personas || []).find((p) => p.id === id))
  const datosPago = (id) => (perfilesDoc || []).find((t) => t.profile_id === id)?.payout_info

  const resumen = idsDocentes.map((id) => {
    const filas = (pendientes || []).filter((p) => p.teacher_id === id)
    const enPeriodo = filas.filter((f) => f.earned_on <= periodo.fin)
    return {
      id,
      total: filas.reduce((a, f) => a + Number(f.teacher_amount), 0),
      periodo: enPeriodo.reduce((a, f) => a + Number(f.teacher_amount), 0),
      ventas: filas.reduce((a, f) => a + Number(f.gross), 0),
      eac: filas.reduce((a, f) => a + Number(f.eac_amount), 0),
    }
  }).filter((r) => r.total !== 0)
  const porPagar = (cortes || []).filter((c) => c.status === 'pendiente')

  return (
    <main className="page">
      <Link href="/admin/docentes" className="back"><Icon name="chevron" size={16} /> Docentes</Link>
      <div className="greeting">
        <div>
          <span className="eyebrow">Marketplace</span>
          <h1>Liquidaciones</h1>
          <p>Lo que se le debe a cada docente por sus cursos propios. Corte quincenal: 1–15 y 16–fin de mes.</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Corte</span><h2>Quincena del {fechaDia(periodo.inicio)} al {fechaDia(periodo.fin)}</h2></div></div>
      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1.3fr' }}><span>Docente</span><span className="right">Ventas sin corte</span><span className="right">Retención EAC</span><span className="right">A pagar en este corte</span><span /></div>
        {resumen.map((r) => (
          <div key={r.id} className="table-row" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1.3fr' }}>
            <span><b>{nombre(r.id)}</b>{r.total !== r.periodo && <small className="muted" style={{ display: 'block' }}>{money2(r.total - r.periodo)} de esta quincena entra en el siguiente corte</small>}</span>
            <span className="right">{money2(r.ventas)}</span>
            <span className="right">{money2(r.eac)}</span>
            <span className="right"><b>{money2(r.periodo)}</b></span>
            <span style={{ textAlign: 'right' }}>
              {r.periodo > 0 ? (
                <form action={generarCorte}>
                  <input type="hidden" name="teacher_id" value={r.id} /><input type="hidden" name="inicio" value={periodo.inicio} /><input type="hidden" name="fin" value={periodo.fin} />
                  <button className="primary sm" type="submit">Generar corte</button>
                </form>
              ) : <span className="muted" style={{ fontSize: 12 }}>Nada en este corte</span>}
            </span>
          </div>
        ))}
        {!resumen.length && <div className="empty-card" style={{ padding: 20 }}>No hay ganancias pendientes de docentes.</div>}
      </section>

      <div className="section-head"><div><span className="eyebrow">Por transferir</span><h2>Cortes pendientes de pago</h2></div></div>
      <div className="stack">
        {porPagar.map((c) => (
          <section key={c.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div><b>{nombre(c.teacher_id)}</b><small className="muted" style={{ display: 'block' }}>{fechaDia(c.period_start)} – {fechaDia(c.period_end)}</small></div>
              <strong style={{ fontSize: 22 }}>{money2(c.amount)}</strong>
            </div>
            <p style={{ whiteSpace: 'pre-line', fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
              {datosPago(c.teacher_id) || 'Sin datos de pago: pídele que los registre en su perfil docente.'}
            </p>
            <form action={marcarCortePagado} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input type="hidden" name="id" value={c.id} />
              <input name="reference" placeholder="Referencia o folio de la transferencia" style={{ flex: 1, minWidth: 220 }} />
              <button className="primary" type="submit"><Icon name="check" size={18} /> Marcar como pagado</button>
            </form>
          </section>
        ))}
        {!porPagar.length && <div className="card empty-card" style={{ padding: 20 }}>No hay cortes por transferir.</div>}
      </div>

      <div className="section-head"><div><span className="eyebrow">Historial</span><h2>Cortes pagados</h2></div></div>
      <section className="table-panel">
        {(cortes || []).filter((c) => c.status === 'pagado').map((c) => (
          <div key={c.id} className="table-row" style={{ gridTemplateColumns: '1.6fr 1.4fr 1fr 1fr' }}>
            <span><b>{nombre(c.teacher_id)}</b></span>
            <span>{fechaDia(c.period_start)} – {fechaDia(c.period_end)}</span>
            <span className="right">{money2(c.amount)}</span>
            <span className="muted">Pagado {fechaDia(c.paid_on)}{c.reference ? ` · ${c.reference}` : ''}</span>
          </div>
        ))}
        {!(cortes || []).some((c) => c.status === 'pagado') && <div className="empty-card" style={{ padding: 20 }}>Todavía no hay cortes pagados.</div>}
      </section>

      <div className="section-head"><div><span className="eyebrow">Ajustes</span><h2>Reparto general</h2></div></div>
      <form action={guardarPorcentaje} className="card" style={{ padding: 22, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0 }}><label>% para el docente en cursos sin porcentaje propio</label><input name="pct" inputMode="decimal" defaultValue={pct} style={{ maxWidth: 140 }} /></div>
        <button className="secondary" type="submit">Guardar</button>
        <p className="muted" style={{ fontSize: 12, width: '100%', margin: 0 }}>Aplica a los pagos que se registren desde ahora. Cada curso puede tener su propio porcentaje en su ficha.</p>
      </form>
    </main>
  )
}
