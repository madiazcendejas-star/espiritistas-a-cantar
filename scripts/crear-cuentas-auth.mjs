#!/usr/bin/env node
// =====================================================================
// EAC Academia v2 · Crea una cuenta de Supabase Auth por cada estudiante
// migrado, con SU MISMA contraseña (se importa el hash bcrypt).
//
// Requisitos:
//   - Haber corrido las migraciones y `select * from app.sync_from_legacy();`
//   - En Supabase → Settings → API → Exposed schemas: agregar "app".
//   - Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (nunca en el repo).
//
// Uso:
//   node scripts/crear-cuentas-auth.mjs            # simulación: solo cuenta, no crea nada
//   node scripts/crear-cuentas-auth.mjs --ejecutar # crea las cuentas
//
// Es idempotente: solo procesa perfiles sin auth_user_id.
// Nunca imprime correos, teléfonos ni contraseñas.
// =====================================================================

const URL_SB = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EJECUTAR = process.argv.includes('--ejecutar')
const DOMINIO_TECNICO = process.env.DOMINIO_CORREO_TECNICO || 'acceso.espiritistasacantar.com'

if (!URL_SB || !KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const app = { ...headers, 'Accept-Profile': 'app', 'Content-Profile': 'app' }

async function rest(path, opts = {}) {
  const res = await fetch(`${URL_SB}/rest/v1/${path}`, { ...opts, headers: { ...app, ...(opts.headers || {}) } })
  if (!res.ok) throw new Error(`REST ${path}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

// Correo con el que se crea la cuenta: el real o uno técnico interno (nunca lo ve el estudiante).
const correoCuenta = (p) => p.email || `alumno-${p.id}@${DOMINIO_TECNICO}`

async function crearUsuario(p, hash) {
  const res = await fetch(`${URL_SB}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: correoCuenta(p),
      email_confirm: true,
      ...(hash ? { password_hash: hash } : {}),
      app_metadata: { profile_id: p.id, role: p.role },
      user_metadata: { matricula: p.matricula, correo_tecnico: !p.email },
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Auth ${res.status}: ${body.msg || body.message || JSON.stringify(body)}`)
  return body.id
}

const perfiles = await rest('profiles?select=id,matricula,role,email&auth_user_id=is.null&order=id')
const credenciales = await rest('legacy_credentials?select=profile_id,password_bcrypt')
const hashDe = new Map(credenciales.map((c) => [c.profile_id, c.password_bcrypt]))

const resumen = {
  perfiles_sin_cuenta: perfiles.length,
  con_correo_real: perfiles.filter((p) => p.email).length,
  con_correo_tecnico: perfiles.filter((p) => !p.email).length,
  sin_contraseña_heredada: perfiles.filter((p) => !hashDe.has(p.id)).length,
}
console.log(EJECUTAR ? 'MODO EJECUCIÓN' : 'MODO SIMULACIÓN (agrega --ejecutar para crear las cuentas)')
console.table(resumen)
if (!EJECUTAR) process.exit(0)

let creadas = 0
const errores = []
for (const p of perfiles) {
  try {
    const authId = await crearUsuario(p, hashDe.get(p.id))
    await rest(`profiles?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify({ auth_user_id: authId }), headers: { Prefer: 'return=minimal' } })
    if (hashDe.has(p.id)) {
      await rest(`legacy_credentials?profile_id=eq.${p.id}`, {
        method: 'PATCH', body: JSON.stringify({ migrated_at: new Date().toISOString() }), headers: { Prefer: 'return=minimal' },
      })
    }
    creadas++
  } catch (e) {
    errores.push({ profile_id: p.id, error: String(e.message).slice(0, 160) })
  }
}
console.log(`Cuentas creadas: ${creadas} de ${perfiles.length}`)
if (errores.length) {
  console.log('Errores (por id de perfil, sin datos personales):')
  console.table(errores)
  process.exitCode = 1
}
