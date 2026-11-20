#!/usr/bin/env node
// =====================================================================
// EAC Academia v2 · Crea una cuenta de Supabase Auth por cada estudiante
// migrado, con SU MISMA contraseña (se importa el hash bcrypt).
//
// Requisitos:
//   - Haber corrido las migraciones y `select * from app.sync_from_legacy();`
//   - En Supabase → Settings → API → Exposed schemas: agregar "app".
//   - Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (service_role o secret key sb_secret_...; nunca en el repo).
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

// Claves heredadas (JWT "eyJ...") van también en Authorization; las nuevas (sb_secret_...) solo en apikey.
const headers = {
  apikey: KEY,
  ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}),
  'Content-Type': 'application/json',
}
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

// Si el proceso se interrumpió, puede existir la cuenta de Auth sin estar ligada al perfil.
// Se busca por correo para ligarla en lugar de fallar.
let cuentasExistentes = null
async function buscarCuentaPorCorreo(correo) {
  if (!cuentasExistentes) {
    cuentasExistentes = new Map()
    for (let page = 1; ; page++) {
      const res = await fetch(`${URL_SB}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers })
      if (!res.ok) throw new Error(`Auth listado ${res.status}`)
      const { users = [] } = await res.json()
      users.forEach((u) => u.email && cuentasExistentes.set(u.email.toLowerCase(), u.id))
      if (users.length < 1000) break
    }
  }
  return cuentasExistentes.get(correo.toLowerCase()) || null
}

const perfiles = await rest('profiles?select=id,matricula,role,email&auth_user_id=is.null&order=id')
const credenciales = await rest('legacy_credentials?select=profile_id,password_bcrypt')
const hashDe = new Map(credenciales.map((c) => [c.profile_id, c.password_bcrypt]))

// Contraseñas cambiadas en la app anterior después de crear la cuenta
// (la sincronización las marca con migrated_at = null).
const ligados = await rest('profiles?select=id,auth_user_id&auth_user_id=not.is.null')
const pendientesHash = new Set(
  (await rest('legacy_credentials?select=profile_id&migrated_at=is.null')).map((c) => c.profile_id),
)
const porActualizar = ligados.filter((p) => pendientesHash.has(p.id))

const resumen = {
  perfiles_sin_cuenta: perfiles.length,
  contraseñas_por_actualizar: porActualizar.length,
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
    let authId
    try {
      authId = await crearUsuario(p, hashDe.get(p.id))
    } catch (e) {
      authId = /already|exists|registered/i.test(e.message) ? await buscarCuentaPorCorreo(correoCuenta(p)) : null
      if (!authId) throw e
    }
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
let actualizadas = 0
for (const p of porActualizar) {
  try {
    const res = await fetch(`${URL_SB}/auth/v1/admin/users/${p.auth_user_id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password_hash: hashDe.get(p.id) }),
    })
    if (!res.ok) throw new Error(`Auth ${res.status}: ${(await res.text()).slice(0, 120)}`)
    await rest(`legacy_credentials?profile_id=eq.${p.id}`, {
      method: 'PATCH', body: JSON.stringify({ migrated_at: new Date().toISOString() }), headers: { Prefer: 'return=minimal' },
    })
    actualizadas++
  } catch (e) {
    errores.push({ profile_id: p.id, error: String(e.message).slice(0, 160) })
  }
}

console.log(`Cuentas creadas: ${creadas} de ${perfiles.length}`)
console.log(`Contraseñas actualizadas: ${actualizadas} de ${porActualizar.length}`)
if (errores.length) {
  console.log('Errores (por id de perfil, sin datos personales):')
  console.table(errores)
  process.exitCode = 1
}
