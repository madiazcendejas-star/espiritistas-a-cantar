import { createPublicClient } from './supabase/public'

const ART = ['lilac', 'blue-art', 'gold-art', 'rose-art']
export const artFor = (id) => ART[Number(id) % ART.length]

// Catálogo público: cursos visibles con sus grupos activos.
export async function getCatalog() {
  const supabase = createPublicClient()
  const [{ data: courses, error }, { data: groups }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, description, cover_url, price, modality, duration_text, is_upcoming, is_featured')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('course_groups')
      .select('id, course_id, name, modality, starts_on, price_total, installments, recurrence, schedule_text, status')
      .eq('status', 'activo'),
  ])
  if (error) throw error
  return (courses || []).map((c) => withGroups(c, (groups || []).filter((g) => g.course_id === c.id)))
}

export async function getCourse(id) {
  const supabase = createPublicClient()
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, what_you_learn, duration_text, cover_url, price, modality, is_upcoming')
    .eq('id', id)
    .maybeSingle()
  if (!course) return null
  const { data: groups } = await supabase
    .from('course_groups')
    .select('id, course_id, name, modality, starts_on, ends_on, price_total, enrollment_fee, installments, frequency, recurrence, schedule_text, capacity, status')
    .eq('course_id', id)
    .eq('status', 'activo')
    .order('starts_on', { ascending: true, nullsFirst: false })
  return withGroups(course, groups || [])
}

function withGroups(course, groups) {
  const precios = groups.map((g) => Number(g.price_total) || 0).filter((p) => p > 0)
  const desde = precios.length ? Math.min(...precios) : Number(course.price) || 0
  return {
    ...course,
    groups,
    precioDesde: desde,
    // Si el precio más bajo es una colegiatura, se muestra «/ mes», «/ semana»…
    periodoDesde: groups.find((g) => Number(g.price_total) === desde && g.recurrence)?.recurrence || null,
    modalidades: [...new Set(groups.map((g) => g.modality))],
  }
}
