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

const tel10 = (v) => String(v || '').replace(/\D/g, '').slice(-10) || null

// Crea perfil + cuenta de acceso con la contraseña que eligió la persona.
export async function crearCuenta(admin, { email, password, nombre, apellidos, telefono, source = 'registro' }) {
  const { data: id } = await admin.rpc('next_profile_id')
  const { data: matricula } = await admin.rpc('next_matricula')
  const { data: creado, error: errAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { profile_id: id, role: 'student' },
    user_metadata: { matricula },
  })
  if (errAuth) return { error: /already|exists|registered/i.test(errAuth.message) ? 'existe' : errAuth.message }
  const { error } = await admin.from('profiles').insert({
    id, matricula, role: 'student', first_name: nombre, last_name: apellidos || null,
    phone: telefono || null, phone10: tel10(telefono), email, auth_user_id: creado.user.id,
    must_change_password: false, source,
  })
  if (error) {
    await admin.auth.admin.deleteUser(creado.user.id)
    return { error: error.code === '23505' ? 'existe' : error.message }
  }
  return { id, matricula }
}
