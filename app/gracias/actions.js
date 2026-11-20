'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, perfilDeCheckout } from '@/lib/stripe'

// Quien compró por primera vez elige aquí su contraseña. Solo funciona con la
// compra que creó la cuenta y una sola vez.
export async function crearContrasenaCompra(_prev, formData) {
  const sessionId = String(formData.get('session_id') || '')
  const nueva = String(formData.get('nueva') || '')
  const confirmar = String(formData.get('confirmar') || '')
  if (nueva.length < 8) return { error: 'Usa al menos 8 caracteres.' }
  if (nueva !== confirmar) return { error: 'Las contraseñas no coinciden.' }
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { error: 'El enlace no es válido.' }

  let destino = '/mi-espacio'
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') return { error: 'Tu pago aún no se confirma.' }
    const db = createAdminClient()
    const perfil = await perfilDeCheckout(db, session)
    if (!perfil?.auth_user_id) return { error: 'Estamos terminando de crear tu cuenta. Espera unos segundos e intenta de nuevo.' }

    const { data: u } = await db.auth.admin.getUserById(perfil.auth_user_id)
    const meta = u?.user?.user_metadata || {}
    if (meta.contrasena_pendiente !== sessionId) return { error: 'Tu contraseña ya fue creada. Inicia sesión con ella.' }

    const { error } = await db.auth.admin.updateUserById(perfil.auth_user_id, {
      password: nueva,
      user_metadata: { ...meta, contrasena_pendiente: null },
    })
    if (error) return { error: 'No pudimos guardar tu contraseña. Intenta con otra diferente.' }

    const supabase = await createClient()
    await supabase.auth.signInWithPassword({ email: u.user.email, password: nueva })
    if (session.metadata?.grupo_id) destino = `/mi-espacio/grupo/${session.metadata.grupo_id}`
  } catch (e) {
    console.error('crearContrasenaCompra', e)
    return { error: 'Algo salió mal. Intenta de nuevo en un momento.' }
  }
  redirect(destino)
}
