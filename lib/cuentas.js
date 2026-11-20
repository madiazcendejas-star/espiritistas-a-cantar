import 'server-only'

export const ERROR_GENERICO = 'Los datos de acceso no coinciden. Revisa tu teléfono, matrícula o correo y tu contraseña.'
export const esCorreoTecnico = (email) => !email || /@acceso\.espiritistasacantar\.com$/i.test(email)

// Busca el perfil por lo que escribe la persona: teléfono, matrícula o correo.
export async function buscarPerfil(admin, identificador) {
  const valor = String(identificador || '').trim()
  const cols = 'id, auth_user_id, email, first_name'
  if (!valor || /[,()]/.test(valor)) return { error: ERROR_GENERICO }

  if (valor.includes('@')) {
    const { data } = await admin.from('profiles').select(cols).ilike('email', valor.replace(/[%_\\]/g, '\\$&')).maybeSingle()
    return data ? { perfil: data } : { error: ERROR_GENERICO }
  }

  const limpio = valor.replace(/[%_\\]/g, '\\$&')
  const { data: porMatricula } = await admin
    .from('profiles')
    .select(cols)
    .or(`matricula.ilike.${limpio},matricula.ilike.EAC-${limpio}`)
    .limit(2)
  if (porMatricula?.length === 1) return { perfil: porMatricula[0] }

  const digitos = valor.replace(/\D/g, '')
  if (digitos.length >= 10) {
    const { data: porTelefono } = await admin.from('profiles').select(cols).eq('phone10', digitos.slice(-10)).limit(2)
    if (porTelefono?.length > 1) return { error: 'Este teléfono está registrado en más de una cuenta. Entra con tu matrícula o tu correo.', compartido: true }
    if (porTelefono?.length === 1) return { perfil: porTelefono[0] }
  }
  return { error: ERROR_GENERICO }
}

// Correo de la cuenta de Supabase Auth del perfil.
export async function correoDeCuenta(admin, perfil) {
  if (!perfil?.auth_user_id) return null
  const { data, error } = await admin.auth.admin.getUserById(perfil.auth_user_id)
  if (error || !data?.user?.email) return null
  return data.user.email
}
