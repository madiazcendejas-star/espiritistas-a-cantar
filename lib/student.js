import 'server-only'
import { hoyMx } from './format'

// Datos del panel del estudiante. Usa el cliente con sesión: RLS limita todo
// a lo que le corresponde a la persona.
export async function getMisGrupos(supabase) {
  const { data: mios, error } = await supabase.from('my_groups').select('group_id, course_id, enrollment_status, access_state')
  if (error) throw error
  const activos = (mios || []).filter((m) => m.enrollment_status === 'activa')
  if (!activos.length) return []

  const groupIds = activos.map((m) => m.group_id)
  const courseIds = [...new Set(activos.map((m) => m.course_id))]
  const [{ data: grupos }, { data: cursos }] = await Promise.all([
    supabase.from('course_groups').select('id, course_id, name, modality, starts_on, schedule_text, whatsapp_url, installments, price_total').in('id', groupIds),
    supabase.from('courses').select('id, title, cover_url, manual_pdf_url').in('id', courseIds),
  ])
  return activos
    .map((m) => ({
      ...m,
      grupo: (grupos || []).find((g) => g.id === m.group_id),
      curso: (cursos || []).find((c) => c.id === m.course_id),
    }))
    .filter((x) => x.grupo && x.curso)
    .sort((a, b) => (a.access_state === 'activo' ? -1 : 1) - (b.access_state === 'activo' ? -1 : 1))
}

export async function getProximasSesiones(supabase, limite = 5) {
  const desde = new Date(Date.now() - 90 * 60000).toISOString()
  const { data } = await supabase
    .from('live_sessions')
    .select('id, group_id, number, title, starts_at, meet_url, recording_url')
    .gte('starts_at', desde)
    .order('starts_at', { ascending: true })
    .limit(limite)
  return data || []
}

export async function getSesionesPasadas(supabase, limite = 20) {
  const hasta = new Date(Date.now() - 90 * 60000).toISOString()
  const { data } = await supabase
    .from('live_sessions')
    .select('id, group_id, number, title, starts_at, meet_url, recording_url')
    .lt('starts_at', hasta)
    .order('starts_at', { ascending: false })
    .limit(limite)
  return data || []
}

export async function getPagos(supabase) {
  const { data } = await supabase
    .from('payments')
    .select('id, group_id, course_id, amount, amount_received, due_date, paid_on, status')
    .order('due_date', { ascending: true, nullsFirst: false })
  const hoy = hoyMx()
  return (data || []).map((p) => ({ ...p, vencido: p.status === 'pendiente' && p.due_date && p.due_date < hoy }))
}
