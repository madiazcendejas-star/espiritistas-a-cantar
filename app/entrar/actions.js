'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PANEL_POR_ROL, rutaSegura } from '@/lib/auth'

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const ERROR_GENERICO = 'Los datos de acceso no coinciden. Revisa tu teléfono, matrícula o correo y tu contraseña.'

// Traduce lo que escribe la persona (teléfono, matrícula o correo) al correo
// de su cuenta de Supabase Auth. Etapa 1 del plan de acceso.
async function resolverCorreoDeCuenta(identificador) {
  const admin = createAdminClient()
  const valor = identificador.trim()
  let perfil = null

  if (valor.includes('@')) {
    const { data } = await admin.from('profiles').select('id, auth_user_id').ilike('email', valor.replace(/[%_\\]/g, '\\$&')).maybeSingle()
    perfil = data
  } else {
    const limpio = valor.replace(/[%_\\]/g, '\\$&')
    const { data: porMatricula } = await admin
      .from('profiles')
      .select('id, auth_user_id')
      .or(`matricula.ilike.${limpio},matricula.ilike.EAC-${limpio}`)
      .limit(2)
    if (porMatricula?.length === 1) perfil = porMatricula[0]

    const digitos = valor.replace(/\D/g, '')
    if (!perfil && digitos.length >= 10) {
      const { data: porTelefono } = await admin.from('profiles').select('id, auth_user_id').eq('phone10', digitos.slice(-10)).limit(2)
      if (porTelefono?.length > 1) return { error: 'Este teléfono está registrado en más de una cuenta. Entra con tu matrícula o tu correo.' }
      if (porTelefono?.length === 1) perfil = porTelefono[0]
    }
  }

  if (!perfil?.auth_user_id) return { error: ERROR_GENERICO }
  const { data: usuario, error } = await admin.auth.admin.getUserById(perfil.auth_user_id)
  if (error || !usuario?.user?.email) return { error: ERROR_GENERICO }
  return { email: usuario.user.email }
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
