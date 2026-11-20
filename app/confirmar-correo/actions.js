'use server'

import { createHash, timingSafeEqual } from 'node:crypto'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

const ir = (estado) => redirect(`/confirmar-correo?estado=${estado}`)

export async function confirmarCorreo(formData) {
  const p = Number(formData.get('p'))
  const t = String(formData.get('t') || '')
  if (!p || !t || t.length > 100) ir('invalido')

  let estado = 'listo'
  try {
    const admin = createAdminClient()
    const { data: perfil } = await admin.from('profiles').select('id, auth_user_id, email').eq('id', p).maybeSingle()
    if (!perfil?.auth_user_id) {
      estado = 'invalido'
    } else {
      const { data: u } = await admin.auth.admin.getUserById(perfil.auth_user_id)
      const meta = u?.user?.user_metadata || {}
      const esperado = Buffer.from(String(meta.correo_token || ''), 'hex')
      const recibido = createHash('sha256').update(t).digest()
      const valido = esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
      if (!valido || !meta.correo_pendiente) estado = perfil.email ? 'ya' : 'invalido'
      else if (Date.now() > Number(meta.correo_exp || 0)) estado = 'expirado'
      else {
        const email = String(meta.correo_pendiente).toLowerCase()
        const { data: otro } = await admin.from('profiles').select('id').ilike('email', email.replace(/[%_\\]/g, '\\$&')).neq('id', p).maybeSingle()
        if (otro) estado = 'ocupado'
        else {
          const { error } = await admin.auth.admin.updateUserById(perfil.auth_user_id, {
            email,
            email_confirm: true,
            user_metadata: { ...meta, correo_pendiente: null, correo_token: null, correo_exp: null, correo_tecnico: false },
          })
          if (error) estado = /already|exists|registered/i.test(error.message) ? 'ocupado' : 'error'
          else {
            await admin.from('profiles').update({ email, email_verified: true }).eq('id', p)
            await admin.from('audit_log').insert({ actor_id: p, action: 'confirmar_correo', entity: 'profile', entity_id: String(p), detail: null })
          }
        }
      }
    }
  } catch (e) {
    console.error('confirmarCorreo', e)
    estado = 'error'
  }
  ir(estado)
}
