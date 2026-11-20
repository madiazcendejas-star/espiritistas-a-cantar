import 'server-only'
import { redirect } from 'next/navigation'
import { getSessionProfile } from './auth'
import { createAdminClient } from './supabase/admin'

// Verifica en el servidor, en cada página y acción, que quien llama es docente (o administración).
export async function requireTeacher() {
  let ctx
  try {
    ctx = await getSessionProfile()
  } catch {
    ctx = { user: null }
  }
  if (!ctx.user) redirect('/entrar?siguiente=/docente')
  if (!['teacher', 'admin'].includes(ctx.profile?.role)) redirect('/docentes')
  return { profile: ctx.profile, db: createAdminClient() }
}

export const esAdmin = (p) => p?.role === 'admin'

export const ESTADO_CURSO = {
  borrador: ['neutral', 'Borrador'],
  en_revision: ['review', 'En revisión'],
  aprobado: ['success', 'Publicado'],
  rechazado: ['danger', 'Con cambios pedidos'],
}

// Cursos propios (marketplace) y cursos donde tiene grupos asignados (docente de EAC).
export async function cursosDelDocente(db, profileId) {
  const [{ data: propios }, { data: asignados }] = await Promise.all([
    db.from('courses').select('id, title, review_status, review_notes, is_visible, cover_url, owner_id, teacher_share, created_at').eq('owner_id', profileId).order('created_at', { ascending: false }),
    db.from('group_teachers').select('group_id, course_groups(id, course_id, name, courses(id, title, review_status, is_visible, cover_url, owner_id))').eq('profile_id', profileId),
  ])
  const porId = new Map((propios || []).map((c) => [c.id, { ...c, propio: true, gruposAsignados: [] }]))
  for (const a of asignados || []) {
    const c = a.course_groups?.courses
    if (!c) continue
    if (!porId.has(c.id)) porId.set(c.id, { ...c, propio: false, gruposAsignados: [] })
    porId.get(c.id).gruposAsignados.push(a.course_groups.id)
  }
  return [...porId.values()]
}

// Grupos que puede administrar: los de sus cursos propios y los asignados.
export async function gruposDelDocente(db, profileId) {
  const cursos = await cursosDelDocente(db, profileId)
  const propios = cursos.filter((c) => c.propio).map((c) => c.id)
  const asignados = cursos.flatMap((c) => c.gruposAsignados)
  const consultas = []
  if (propios.length) consultas.push(db.from('course_groups').select('id, course_id, name, modality, starts_on, schedule_text, status, price_total, installments').in('course_id', propios))
  if (asignados.length) consultas.push(db.from('course_groups').select('id, course_id, name, modality, starts_on, schedule_text, status, price_total, installments').in('id', asignados))
  const res = await Promise.all(consultas)
  const grupos = new Map()
  res.forEach(({ data }) => (data || []).forEach((g) => grupos.set(g.id, g)))
  const titulo = new Map(cursos.map((c) => [c.id, c.title]))
  return [...grupos.values()].map((g) => ({ ...g, curso: titulo.get(g.course_id) || '' }))
}

export async function puedeEditarCurso(db, profile, courseId) {
  if (esAdmin(profile)) return true
  const { data } = await db.from('courses').select('owner_id').eq('id', courseId).maybeSingle()
  return data?.owner_id === profile.id
}

export async function puedeGestionarGrupo(db, profile, groupId) {
  if (esAdmin(profile)) return true
  const { data: g } = await db.from('course_groups').select('course_id, courses(owner_id)').eq('id', groupId).maybeSingle()
  if (!g) return false
  if (g.courses?.owner_id === profile.id) return true
  const { data: asignado } = await db.from('group_teachers').select('group_id').eq('group_id', groupId).eq('profile_id', profile.id).maybeSingle()
  return !!asignado
}

export async function porcentajeGeneral(db) {
  const { data } = await db.from('settings').select('value').eq('key', 'docente_porcentaje').maybeSingle()
  const n = Number(data?.value)
  return Number.isFinite(n) ? n : 70
}

// Quincena (1–15 o 16–fin de mes) que contiene una fecha YYYY-MM-DD.
export function quincena(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const fin = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return d <= 15 ? { inicio: `${y}-${mm}-01`, fin: `${y}-${mm}-15` } : { inicio: `${y}-${mm}-16`, fin: `${y}-${mm}-${fin}` }
}

// Quincena anterior a la que contiene la fecha.
export function quincenaAnterior(iso) {
  const { inicio } = quincena(iso)
  const [y, m, d] = inicio.split('-').map(Number)
  const previo = d === 16 ? `${y}-${String(m).padStart(2, '0')}-15` : new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10)
  return quincena(previo)
}
