import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// «Unirse a la clase en vivo»: registra la asistencia y lleva a Google Meet.
export async function GET(req, { params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.redirect(new URL('/mi-espacio/vivo', req.url))
  let ctx
  try {
    ctx = await getSessionProfile()
  } catch {
    ctx = {}
  }
  if (!ctx.profile) return NextResponse.redirect(new URL('/entrar?siguiente=/mi-espacio/vivo', req.url))

  // Con la sesión del estudiante: RLS solo devuelve la clase si tiene acceso activo al grupo.
  const { data: s } = await ctx.supabase.from('live_sessions').select('id, meet_url').eq('id', id).maybeSingle()
  if (!s?.meet_url) return NextResponse.redirect(new URL('/mi-espacio/vivo', req.url))

  try {
    const db = createAdminClient()
    const ahora = new Date().toISOString()
    const { data: previa } = await db.from('attendance').select('join_count').eq('profile_id', ctx.profile.id).eq('session_id', s.id).maybeSingle()
    if (previa) {
      await db.from('attendance').update({ join_count: (previa.join_count || 1) + 1, last_joined_at: ahora }).eq('profile_id', ctx.profile.id).eq('session_id', s.id)
    } else {
      await db.from('attendance').insert({ profile_id: ctx.profile.id, session_id: s.id, joined_at: ahora, last_joined_at: ahora })
    }
  } catch (e) {
    console.error('Asistencia', e) // nunca impedir que entre a la clase
  }
  return NextResponse.redirect(s.meet_url)
}
