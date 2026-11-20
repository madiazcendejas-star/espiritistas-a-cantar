'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PANEL_POR_ROL, rutaSegura } from '@/lib/auth'
import { buscarPerfil, correoDeCuenta, ERROR_GENERICO } from '@/lib/cuentas'

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function resolverCorreoDeCuenta(identificador) {
  const admin = createAdminClient()
  const r = await buscarPerfil(admin, identificador)
  if (r.error) return { error: r.error }
  const email = await correoDeCuenta(admin, r.perfil)
  return email ? { email } : { error: ERROR_GENERICO }
}

export async function iniciarSesion(_prev, formData) {
  const identificador = String(formData.get('identificador') || '').trim()
  const password = String(formData.get('password') || '')
  const siguiente = rutaSegura(String(formData.get('siguiente') || ''), '')
  if (!identificador || !password) return { error: 'Escribe tu teléfono, matrícula o correo y tu contraseña.', identificador }

  // Evita que la matrícula tenga comas o paréntesis que alteren el filtro.
  if (/[,()]/.test(identificador)) {
    await esperar(500)
    return { error: ERROR_GENERICO, identificador }
  }

  let resuelto
  try {
    resuelto = await resolverCorreoDeCuenta(identificador)
  } catch (e) {
    console.error('Error resolviendo cuenta', e)
    return { error: 'No pudimos conectar con el servidor. Intenta de nuevo.', identificador }
  }
  if (resuelto.error) {
    await esperar(500)
    return { error: resuelto.error, identificador }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email: resuelto.email, password })
  if (error || !data?.user) {
    await esperar(500)
    return { error: ERROR_GENERICO, identificador }
  }

  const { data: perfil } = await supabase.from('profiles').select('role, must_change_password').eq('auth_user_id', data.user.id).maybeSingle()
  if (perfil?.must_change_password) redirect('/entrar/nueva-contrasena')
  redirect(siguiente || PANEL_POR_ROL[perfil?.role] || '/mi-espacio')
}

export async function cambiarContrasena(_prev, formData) {
  const nueva = String(formData.get('nueva') || '')
  const confirmar = String(formData.get('confirmar') || '')
  if (nueva.length < 8) return { error: 'Usa al menos 8 caracteres.' }
  if (nueva !== confirmar) return { error: 'Las contraseñas no coinciden.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { error } = await supabase.auth.updateUser({ password: nueva })
  if (error) return { error: 'No pudimos guardar tu contraseña. Intenta con otra diferente.' }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('auth_user_id', user.id)
    .select('role')
    .maybeSingle()
  redirect(PANEL_POR_ROL[perfil?.role] || '/mi-espacio')
}

export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
