import Flash from '@/components/Flash'
import { requireAdmin } from '@/lib/admin'
import { ajustes } from '@/lib/ajustes'
import { guardarAjustes } from '../actions'

export const metadata = { title: 'Ajustes' }

export default async function Ajustes({ searchParams }) {
  const sp = await searchParams
  const { db } = await requireAdmin()
  const a = await ajustes(db, ['whatsapp_ayuda'])
  return (
    <main className="page" style={{ maxWidth: 860 }}>
      <div className="greeting">
        <div>
          <span className="eyebrow">Configuración</span>
          <h1>Ajustes</h1>
          <p>Datos generales que aparecen en la plataforma.</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />
      <form action={guardarAjustes} className="card" style={{ padding: 22 }}>
        <div className="field">
          <label>WhatsApp de ayuda (10 dígitos)</label>
          <input name="whatsapp_ayuda" inputMode="tel" defaultValue={a.whatsapp_ayuda || ''} placeholder="Ej. 5512345678" />
          <small className="muted" style={{ fontSize: 12 }}>Aparece como botón verde «¿Necesitas ayuda?» en el espacio de estudiantes y en las ligas de pago. El mensaje ya incluye su nombre y matrícula. Déjalo vacío para ocultarlo.</small>
        </div>
        <button className="primary" type="submit">Guardar</button>
      </form>
      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>La firma de las constancias, el enlace «Únete a EAC» y el reparto de docentes se configuran en Constancias y Liquidaciones.</p>
    </main>
  )
}
