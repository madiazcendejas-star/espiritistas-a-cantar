import 'server-only'
import { enviarAviso } from './correo'
import { tokenPago } from './ligaPago'
import { urlDelSitio } from './sitio'
import { money, fechaDia, RECURRENCIA_NOMBRE } from './format'

const esTecnico = (e) => !e || /@acceso\.espiritistasacantar\.com$/i.test(e)

// Genera las cuotas de colegiatura que vencen pronto y avisa por correo a cada persona.
export async function correrColegiaturas(db) {
  const { data: nuevas, error } = await db.rpc('generar_colegiaturas', { p_hoy: null, p_anticipacion: 5 })
  if (error) throw error
  if (!nuevas?.length) return { generadas: 0, avisos: 0 }

  const perfiles = [...new Set(nuevas.map((n) => n.profile_id))]
  const grupos = [...new Set(nuevas.map((n) => n.group_id))]
  const [{ data: personas }, { data: gs }] = await Promise.all([
    db.from('profiles').select('id, first_name, email').in('id', perfiles),
    db.from('course_groups').select('id, name, recurrence, courses(title)').in('id', grupos),
  ])
  let base = process.env.NEXT_PUBLIC_SITE_URL || 'https://espiritistasacantar.com'
  try {
    base = await urlDelSitio()
  } catch {}

  let avisos = 0
  for (const n of nuevas) {
    const p = (personas || []).find((x) => x.id === n.profile_id)
    const g = (gs || []).find((x) => x.id === n.group_id)
    if (!p || esTecnico(p.email)) continue
    try {
      await enviarAviso({
        para: p.email,
        asunto: `Tu colegiatura de ${g?.courses?.title || 'EAC Academia'} vence el ${fechaDia(n.due_date)}`,
        titulo: `Hola${p.first_name ? `, ${p.first_name}` : ''}`,
        parrafos: [
          `Ya está lista tu colegiatura ${RECURRENCIA_NOMBRE[g?.recurrence] || ''} de ${g?.courses?.title || 'tu curso'}${g?.name ? ` (${g.name})` : ''} por ${money(n.amount)} MXN, con vencimiento el ${fechaDia(n.due_date)}.`,
          'Puedes pagarla con tarjeta u OXXO desde el botón, sin necesidad de iniciar sesión.',
        ],
        boton: `Pagar ${money(n.amount)}`,
        enlace: `${base}/pagar/${tokenPago(n.payment_id)}`,
      })
      avisos++
    } catch (e) {
      console.error('Aviso de colegiatura', e)
    }
  }
  return { generadas: nuevas.length, avisos }
}
