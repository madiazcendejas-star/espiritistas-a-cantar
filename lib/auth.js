import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'

export const PANEL_POR_ROL = { student: '/mi-espacio', teacher: '/docente', admin: '/admin' }

// Solo acepta rutas internas (evita redirecciones abiertas).
export function rutaSegura(ruta, porDefecto = '/mi-espacio') {
  return typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//') ? ruta : porDefecto
}

export async function getSessionProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, matricula, role, first_name, last_name, email, email_verified, phone, must_change_password')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return { supabase, user, profile }
}

// Para layouts de zonas privadas: exige sesión y uno de los roles indicados.
export async function requireRole(roles, siguiente) {
  const ctx = await getSessionProfile()
  if (!ctx.user) redirect(`/entrar?siguiente=${encodeURIComponent(siguiente || '/mi-espacio')}`)
  if (!ctx.profile) redirect('/entrar?error=perfil')
  if (ctx.profile.must_change_password) redirect('/entrar/nueva-contrasena')
  if (!roles.includes(ctx.profile.role)) redirect(PANEL_POR_ROL[ctx.profile.role] || '/')
  return ctx
}

export function nombreCorto(profile) {
  return (profile?.first_name || '').trim().split(/\s+/)[0] || ''
}

export function iniciales(profile) {
  const a = (profile?.first_name || '').trim()[0] || ''
  const b = (profile?.last_name || '').trim()[0] || ''
  return (a + b).toUpperCase() || 'EAC'
}
