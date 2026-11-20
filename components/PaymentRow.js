import Icon from './Icon'
import { registrarPago, cancelarCuota } from '@/app/admin/actions'
import { money, fechaDia, hoyMx } from '@/lib/format'

const ESTADO = {
  pagado: ['success', 'Pagado'],
  pendiente: ['review', 'Pendiente'],
  en_revision: ['info', 'En revisión'],
  cancelado: ['neutral', 'Cancelado'],
}
const METODO = { tarjeta: 'Tarjeta', spei: 'SPEI', oxxo: 'OXXO', efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro' }

// Fila de cuota con el formulario para registrar el pago a mano.
export default function PaymentRow({ p, contexto, regreso }) {
  const vencida = p.status === 'pendiente' && p.due_date && p.due_date < hoyMx()
  const [tono, texto] = vencida ? ['danger', 'Vencida'] : ESTADO[p.status] || ['neutral', p.status]
  const abierta = p.status === 'pendiente' || p.status === 'en_revision'
  return (
    <details className="card" style={{ padding: 0 }}>
      <summary className="pay-sum" style={{ cursor: abierta ? 'pointer' : 'default' }}>
        <span><b>{contexto}</b>{p.notes && <small className="muted" style={{ display: 'block', fontSize: 12 }}>{p.notes}</small>}</span>
        <span style={{ fontSize: 13 }}>{p.status === 'pagado' ? `Pagado el ${fechaDia(p.paid_on || p.due_date)}` : p.due_date ? `Vence el ${fechaDia(p.due_date)}` : 'Sin fecha'}</span>
        <span><b>{money(p.amount)}</b>{p.method && <small className="muted" style={{ display: 'block', fontSize: 11 }}>{METODO[p.method] || p.method}</small>}</span>
        <span><i className={`status ${tono}`}>{texto}</i></span>
        {abierta ? <span className="primary sm">Registrar pago</span> : <span />}
      </summary>
      {abierta && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--line)' }}>
          <form action={registrarPago} style={{ marginTop: 14 }}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="regreso" value={regreso} />
            <div className="grid3">
              <div className="field">
                <label>Método</label>
                <select name="method" defaultValue="transferencia">
                  {Object.entries(METODO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </div>
              <div className="field"><label>Fecha de pago</label><input type="date" name="paid_on" defaultValue={hoyMx()} /></div>
              <div className="field"><label>Monto recibido (MXN)</label><input name="amount_received" inputMode="decimal" defaultValue={p.amount} /></div>
            </div>
            <div className="field"><label>Nota (opcional)</label><input name="notes" placeholder="Ej. referencia de transferencia o folio" /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button className="primary" type="submit"><Icon name="check" size={18} /> Confirmar pago</button>
            </div>
          </form>
          <form action={cancelarCuota} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="regreso" value={regreso} />
            <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Cancelar esta cuota</button>
          </form>
        </div>
      )}
    </details>
  )
}
