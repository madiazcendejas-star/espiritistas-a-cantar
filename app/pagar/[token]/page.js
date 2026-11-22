import Link from 'next/link'
import Brand from '@/components/Brand'
import Icon from '@/components/Icon'
import { createAdminClient } from '@/lib/supabase/admin'
import { idDeToken, waMe } from '@/lib/ligaPago'
import { ajustes } from '@/lib/ajustes'
import { money, fechaDia, hoyMx } from '@/lib/format'
import { pagarConLiga } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pagar cuota', robots: { index: false } }

export default async function PagarConLiga({ params, searchParams }) {
  const { token } = await params
  const { error } = await searchParams
  const id = idDeToken(token)
  let pago = null
  let perfil = null
  let ayuda = null
  if (id) {
    const db = createAdminClient()
    const r = await db.from('payments').select('id, profile_id, amount, due_date, status, paid_on, courses(title), course_groups(name)').eq('id', id).maybeSingle()
    pago = r.data
    if (pago) perfil = (await db.from('profiles').select('first_name, matricula').eq('id', pago.profile_id).single()).data
    ayuda = (await ajustes(db, ['whatsapp_ayuda'])).whatsapp_ayuda
  }
  const vencida = pago?.status === 'pendiente' && pago.due_date && pago.due_date < hoyMx()
  const linkAyuda = waMe(ayuda, `Hola, necesito ayuda para pagar mi cuota${perfil?.matricula ? ` (matrícula ${perfil.matricula})` : ''}.`)

  return (
    <div className="auth-form" style={{ minHeight: '100vh' }}>
      <div>
        <div style={{ marginBottom: 24 }}><Brand /></div>
        {!pago || pago.status === 'cancelado' ? (
          <>
            <span className="eyebrow">Liga de pago</span>
            <h1>Esta liga ya no es válida</h1>
            <p className="sub">Pide una nueva a EAC Academia por WhatsApp.</p>
          </>
        ) : pago.status === 'pagado' ? (
          <>
            <span className="eyebrow">Pago recibido</span>
            <h1>¡Esta cuota ya está pagada!</h1>
            <p className="sub">Registramos tu pago del {fechaDia(pago.paid_on)}. Gracias{perfil?.first_name ? `, ${perfil.first_name}` : ''}.</p>
            <Link href="/mi-espacio/pagos" className="primary full">Ver mis pagos</Link>
          </>
        ) : (
          <>
            <span className="eyebrow">Pagar cuota</span>
            <h1>Hola{perfil?.first_name ? `, ${perfil.first_name}` : ''}</h1>
            <p className="sub">Esta es tu cuota de <b>{pago.courses?.title || 'EAC Academia'}</b>{pago.course_groups?.name ? ` (${pago.course_groups.name})` : ''}.</p>
            <section className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span className="muted">Monto</span>
                <strong style={{ fontSize: 30, color: 'var(--ink-2)' }}>{money(pago.amount)} <small style={{ fontSize: 14, color: 'var(--muted)' }}>MXN</small></strong>
              </div>
              {pago.due_date && (
                <p style={{ margin: '8px 0 0', fontSize: 14 }} className={vencida ? '' : 'muted'}>
                  {vencida ? <i className="status danger">Vencida el {fechaDia(pago.due_date)}</i> : `Vence el ${fechaDia(pago.due_date)}`}
                </p>
              )}
            </section>
            {error && <div className="form-error" role="alert">No pudimos abrir el pago. Intenta de nuevo en unos minutos.</div>}
            <form action={pagarConLiga}>
              <input type="hidden" name="token" value={token} />
              <button className="primary full" type="submit" style={{ minHeight: 54, fontSize: 16 }}><Icon name="card" size={20} /> Pagar {money(pago.amount)}</button>
            </form>
            <p className="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 12 }}>Pago seguro con tarjeta u OXXO. {vencida ? 'Al pagar, tu acceso se reactiva solo.' : 'Se registra en automático.'}</p>
          </>
        )}
        {linkAyuda && (
          <a href={linkAyuda} target="_blank" rel="noopener noreferrer" className="secondary full" style={{ marginTop: 14 }}><Icon name="message" size={18} /> ¿Necesitas ayuda? Escríbenos</a>
        )}
      </div>
    </div>
  )
}
