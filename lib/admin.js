import 'server-only'
import { redirect } from 'next/navigation'
import { getSessionProfile } from './auth'
import { createAdminClient } from './supabase/admin'

export const DOMINIO_CORREO_TECNICO = process.env.DOMINIO_CORREO_TECNICO || 'acceso.espiritistasacantar.com'

// Verifica en el servidor, en CADA acción, que quien llama es administración.
export async function requireAdmin() {
  let ctx
  try {
    ctx = await getSessionProfile()
  } catch {
    ctx = { user: null }
  }
  if (!ctx.user) redirect('/entrar?siguiente=/admin')
  if (ctx.profile?.role !== 'admin') redirect('/')
  return { profile: ctx.profile, db: createAdminClient() }
}

export async function audit(db, actor, action, entity, entityId, detail) {
  await db.from('audit_log').insert({ actor_id: actor.id, action, entity, entity_id: entityId == null ? null : String(entityId), detail: detail || null })
}

export async function nextId(db, seq) {
  const { data, error } = await db.rpc('next_id', { p_seq: seq })
  if (error) throw error
  return data
}

export const nombreCompleto = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Sin nombre'

export const txt = (fd, k) => {
  const v = fd.get(k)
  return v == null ? '' : String(v).trim()
}
export const num = (fd, k) => {
  const v = Number(String(fd.get(k) ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(v) ? v : 0
}
export const nullable = (v) => (v === '' || v == null ? null : v)

// Marca o quita la asistencia de una persona a una sesión (verifica que la sesión sea del grupo).
export async function guardarAsistencia(db, actor, formData) {
  const groupId = Number(formData.get('group_id'))
  const sessionId = Number(formData.get('session_id'))
  const profileId = Number(formData.get('profile_id'))
  const { data: s } = await db.from('live_sessions').select('id').eq('id', sessionId).eq('group_id', groupId).maybeSingle()
  if (!s) return
  if (formData.get('presente') === '1') {
    await db.from('attendance').upsert({ profile_id: profileId, session_id: sessionId, method: 'manual', marked_by: actor.id, joined_at: new Date().toISOString() }, { onConflict: 'profile_id,session_id', ignoreDuplicates: true })
  } else {
    await db.from('attendance').delete().eq('profile_id', profileId).eq('session_id', sessionId)
  }
  await audit(db, actor, 'asistencia', 'live_session', sessionId, { profileId, presente: formData.get('presente') === '1' })
}

// Categorías, nivel y módulos (ficha del curso en admin y portal docente).
const SLUGS_CATEGORIA = ['espiritismo-cruzado', 'espiritismo-kardeciano', 'tarot', 'oraculos', 'numerologia', 'mancias', 'desarrollo-espiritual', 'desarrollo-personal']
export function camposCatalogo(formData) {
  const nivel = String(formData.get('level') || '')
  const modulos = Math.round(Number(formData.get('modules_count')))
  return {
    categories: formData.getAll('categories').map(String).filter((c) => SLUGS_CATEGORIA.includes(c)),
    level: ['principiante', 'intermedio', 'avanzado', 'todos'].includes(nivel) ? nivel : null,
    modules_count: Number.isFinite(modulos) && modulos > 0 ? modulos : null,
  }
}
