'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Se valida al tocar el botón (no al abrir el enlace), para que los revisores
// automáticos de correo no gasten el enlace antes que la persona.
export async function validarEnlace(formData) {
  const token = String(formData.get('t') || '')
  if (!token || token.length > 200) redirect('/entrar/recuperar?error=expirado')
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: token })
  if (error) redirect('/entrar/recuperar?error=expirado')
  redirect('/entrar/nueva-contrasena?motivo=recuperar')
}
