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
