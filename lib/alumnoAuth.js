// SOLO SERVIDOR. Lógica de acceso de estudiantes (transitoria hasta migrar a Supabase Auth).
import { getSupabaseAdmin } from './supabaseAdmin'

// Contraseña que la app actual acepta cuando el registro no tiene una propia.
// Se conserva para no dejar fuera a nadie; se elimina al migrar a Supabase Auth.
const PASSWORD_POR_DEFECTO = process.env.ALUMNO_PASSWORD_POR_DEFECTO || 'EAC2026*'

const norm = (v) => (v === null || v === undefined ? '' : String(v).trim().toLowerCase())
const soloDigitos = (v) => norm(v).replace(/\D/g, '')

export function passwordRegistrada(alumno) {
  return alumno.password || alumno.Password || PASSWORD_POR_DEFECTO
}

// Quita campos sensibles antes de enviar el registro al navegador.
export function sanitizar(alumno) {
  if (!alumno) return null
  const { password, Password, ...resto } = alumno
  return resto
}

// Busca por matrícula, teléfono o correo con las mismas reglas que la app actual
// (comparación sin espacios ni mayúsculas) y, además, teléfono por dígitos.
export async function buscarAlumno(identificador) {
  const busqueda = norm(identificador)
  if (!busqueda) return null
  const digitos = soloDigitos(identificador)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('alumnos').select('*')
  if (error) throw error
  return (data || []).find((a) => {
    const mat = norm(a.matricula)
    const tel = norm(a.telefono)
    const mail = a.correo && a.correo !== 'EMPTY' ? norm(a.correo) : ''
    const telDig = soloDigitos(a.telefono)
    return (
      (mat && mat === busqueda) ||
      (tel && tel === busqueda) ||
      (mail && mail === busqueda) ||
      (digitos.length >= 10 && telDig && telDig.slice(-10) === digitos.slice(-10))
    )
  }) || null
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
