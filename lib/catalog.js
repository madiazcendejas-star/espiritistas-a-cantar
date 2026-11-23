import { createPublicClient } from './supabase/public'

// Categorías del catálogo (en el orden en que aparecen en el inicio).
export const CATEGORIAS = [
  { slug: 'espiritismo-cruzado', nombre: 'Espiritismo cruzado cubano', simbolo: '✠' },
  { slug: 'espiritismo-kardeciano', nombre: 'Espiritismo kardeciano', simbolo: '☉' },
  { slug: 'tarot', nombre: 'Tarot', simbolo: '✦' },
  { slug: 'oraculos', nombre: 'Oráculos', simbolo: '◈' },
  { slug: 'numerologia', nombre: 'Numerología', simbolo: '∞' },
  { slug: 'mancias', nombre: 'Mancias', simbolo: '☾' },
  { slug: 'desarrollo-espiritual', nombre: 'Desarrollo espiritual', simbolo: '❂' },
  { slug: 'desarrollo-personal', nombre: 'Desarrollo personal', simbolo: '❀' },
]
export const NIVEL = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado', todos: 'Todos los niveles' }

const ART = ['lilac', 'blue-art', 'gold-art', 'rose-art']
export const artFor = (id) => ART[Number(id) % ART.length]

const COLS_CATALOGO = 'id, title, description, cover_url, price, modality, duration_text, is_upcoming, is_featured, categories, level, modules_count, manual_pdf_url'

// Catálogo público: cursos visibles con sus grupos activos (opcional: por categoría).
export async function getCatalog({ categoria } = {}) {
  const supabase = createPublicClient()
  let q = supabase.from('courses').select(COLS_CATALOGO)
  if (categoria) q = q.contains('categories', [categoria])
  const [{ data: courses, error }, { data: groups }] = await Promise.all([
    q
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
    .select('id, title, description, what_you_learn, duration_text, cover_url, price, modality, is_upcoming, categories, level, modules_count, manual_pdf_url')
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

// Los más elegidos: primero los destacados, luego por inscripciones activas.
export async function getPopulares(n = 3) {
  const cursos = (await getCatalog()).filter((c) => !c.is_upcoming)
  let conteo = new Map()
  try {
    const { createAdminClient } = await import('./supabase/admin')
    const { data } = await createAdminClient().from('enrollments').select('course_id').eq('status', 'activa')
    for (const e of data || []) conteo.set(e.course_id, (conteo.get(e.course_id) || 0) + 1)
  } catch {
    conteo = new Map()
  }
  return cursos
    .sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || (conteo.get(b.id) || 0) - (conteo.get(a.id) || 0))
    .slice(0, n)
}

// Texto de modalidad para las tarjetas: «En vivo y grabado», «En vivo», «Grabado», «Presencial».
export function modalidadTexto(modalidades = []) {
  const m = new Set(modalidades)
  const vivo = m.has('en_linea') || m.has('mixto')
  const grabado = m.has('grabado') || m.has('mixto')
  if (vivo && grabado) return 'En vivo y grabado'
  if (vivo) return 'En vivo'
  if (grabado) return 'Grabado'
  if (m.has('presencial')) return 'Presencial'
  return null
}
