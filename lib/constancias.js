import 'server-only'
import { randomInt } from 'node:crypto'

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const nuevoFolio = () => `EAC-${Array.from({ length: 6 }, () => LETRAS[randomInt(LETRAS.length)]).join('')}`

// Clases que cuentan para la constancia automática: lecciones grabadas,
// clases grabadas del grupo y grabaciones de sesiones en vivo (no los PDFs).
export async function itemsRequeridos(db, groupId) {
  const { data: g } = await db.from('course_groups').select('id, course_id').eq('id', groupId).maybeSingle()
  if (!g) return []
  const [{ data: lecciones }, { data: recursos }, { data: sesiones }] = await Promise.all([
    db.from('lessons').select('id').eq('course_id', g.course_id),
    db.from('group_resources').select('id').eq('group_id', groupId).eq('kind', 'video'),
    db.from('live_sessions').select('id').eq('group_id', groupId).not('recording_url', 'is', null),
  ])
  return [
    ...(lecciones || []).map((x) => `l-${x.id}`),
    ...(recursos || []).map((x) => `r-${x.id}`),
    ...(sesiones || []).map((x) => `s-${x.id}`),
  ]
}

export async function avanceDelGrupo(db, profileId, groupId) {
  const [requeridos, { data: vistos }] = await Promise.all([
    itemsRequeridos(db, groupId),
    db.from('content_progress').select('item_key').eq('profile_id', profileId).eq('group_id', groupId),
  ])
  const hechos = new Set((vistos || []).map((v) => v.item_key))
  const vistosReq = requeridos.filter((k) => hechos.has(k)).length
  return { total: requeridos.length, vistos: vistosReq, hechos, completo: requeridos.length > 0 && vistosReq === requeridos.length }
}

export async function constanciaVigente(db, profileId, groupId) {
  const { data } = await db.from('certificates').select('*').eq('profile_id', profileId).eq('group_id', groupId).is('revoked_at', null).maybeSingle()
  return data
}

// Emite (o devuelve la ya emitida) la constancia de una persona en un grupo.
export async function emitirConstancia(db, { profileId, groupId, metodo = 'automatica', emisorId = null }) {
  const existente = await constanciaVigente(db, profileId, groupId)
  if (existente) return { constancia: existente, nueva: false }

  const [{ data: p }, { data: g }] = await Promise.all([
    db.from('profiles').select('id, first_name, last_name, matricula').eq('id', profileId).single(),
    db.from('course_groups').select('id, name, course_id, courses(title)').eq('id', groupId).single(),
  ])
  const fila = {
    profile_id: profileId,
    course_id: g.course_id,
    group_id: groupId,
    full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Estudiante',
    matricula: p.matricula,
    course_title: g.courses?.title || 'Curso',
    group_name: g.name,
    method: metodo,
    issued_by: emisorId,
  }
  for (let intento = 0; intento < 5; intento++) {
    const { data, error } = await db.from('certificates').insert({ ...fila, folio: nuevoFolio() }).select('*').single()
    if (!error) return { constancia: data, nueva: true }
    if (error.code !== '23505') throw error
    // Choque de folio (rarísimo) o la otra petición ya la emitió.
    const ya = await constanciaVigente(db, profileId, groupId)
    if (ya) return { constancia: ya, nueva: false }
  }
  throw new Error('No se pudo generar un folio único')
}

// Sellos: rutas activas con su avance (constancias vigentes de cada curso).
export async function sellosDe(db, profileId) {
  const [{ data: rutas }, { data: certs }] = await Promise.all([
    db.from('learning_paths').select('id, title, description, color, learning_path_courses(course_id, courses(id, title))').eq('is_active', true).order('created_at'),
    db.from('certificates').select('course_id, issued_on').eq('profile_id', profileId).is('revoked_at', null),
  ])
  const porCurso = new Map((certs || []).map((c) => [c.course_id, c.issued_on]))
  return (rutas || []).map((r) => {
    const cursos = (r.learning_path_courses || []).map((x) => x.courses).filter(Boolean)
    const hechos = cursos.filter((c) => porCurso.has(c.id))
    const ganado = cursos.length > 0 && hechos.length === cursos.length
    return {
      ...r,
      cursos: cursos.map((c) => ({ ...c, hecho: porCurso.has(c.id) })),
      hechos: hechos.length,
      total: cursos.length,
      ganado,
      fecha: ganado ? hechos.map((c) => porCurso.get(c.id)).sort().at(-1) : null,
    }
  })
}

export async function firmaConstancia(db) {
  const { data } = await db.from('settings').select('key, value').in('key', ['constancia_firma_nombre', 'constancia_firma_cargo', 'comunidad_url'])
  const v = (k) => (data || []).find((x) => x.key === k)?.value
  return {
    firmaNombre: v('constancia_firma_nombre') || 'Dirección Académica',
    firmaCargo: v('constancia_firma_cargo') || 'EAC Academia',
    comunidadUrl: v('comunidad_url') || '',
  }
}
