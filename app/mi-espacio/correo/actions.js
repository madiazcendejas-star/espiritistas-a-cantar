'use server'

import { randomBytes, createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { esCorreoTecnico } from '@/lib/cuentas'
import { enviarCorreoConfirmacion } from '@/lib/correo'
import { urlDelSitio } from '@/lib/sitio'

const esCorreo = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)

// Guarda el correo como pendiente y manda un enlace para confirmarlo.
// El correo solo se activa cuando la persona lo confirma (evita errores de dedo).
export async function agregarCorreo(_prev, formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!esCorreo(email)) return { error: 'Revisa tu correo, parece que le falta algo (por ejemplo: nombre@gmail.com).', email }
  if (esCorreoTecnico(email)) return { error: 'Usa tu correo personal.', email }

  const { user, profile } = await getSessionProfile()
  if (!user || !profile) return { error: 'Tu sesión terminó. Vuelve a entrar.' }
  if (!esCorreoTecnico(profile.email)) return { ok: true, email: profile.email }

  try {
    const admin = createAdminClient()
    const { data: otro } = await admin.from('profiles').select('id').ilike('email', email.replace(/[%_\\]/g, '\\$&')).neq('id', profile.id).maybeSingle()
    if (otro) return { error: 'Ese correo ya está registrado en otra cuenta. Si es tuyo, escríbenos por WhatsApp.', email }

    const hace2min = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { count } = await admin.from('audit_log').select('id', { count: 'exact', head: true })
      .eq('action', 'pedir_confirmar_correo').eq('entity_id', String(profile.id)).gte('created_at', hace2min)
    if (count) return { error: 'Ya te enviamos un correo hace un momento. Espera 2 minutos para pedir otro.', email }

    const token = randomBytes(32).toString('base64url')
    const { data: u } = await admin.auth.admin.getUserById(user.id)
    const meta = u?.user?.user_metadata || {}
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...meta,
        correo_pendiente: email,
        correo_token: createHash('sha256').update(token).digest('hex'),
        correo_exp: Date.now() + 48 * 60 * 60 * 1000,
      },
    })
    const enlace = `${await urlDelSitio()}/confirmar-correo?p=${profile.id}&t=${token}`
    await enviarCorreoConfirmacion({ para: email, nombre: profile.first_name, enlace })
    await admin.from('audit_log').insert({ actor_id: profile.id, action: 'pedir_confirmar_correo', entity: 'profile', entity_id: String(profile.id), detail: null })
  } catch (e) {
    console.error('agregarCorreo', e)
    return { error: 'No pudimos enviar el correo. Intenta de nuevo en unos minutos.', email }
  }
  revalidatePath('/mi-espacio')
  revalidatePath('/mi-espacio/perfil')
  return { enviado: true, email }
}
