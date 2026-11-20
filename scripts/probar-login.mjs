#!/usr/bin/env node
// Prueba que un estudiante migrado puede iniciar sesión en Supabase Auth con su contraseña de siempre.
// Uso: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... node scripts/probar-login.mjs
// Pide el correo (o matrícula/teléfono no aplica aquí: usa el correo real o alumno-{id}@acceso...) y la contraseña sin mostrarla.
import readline from 'node:readline'

const URL_SB = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY
if (!URL_SB || !KEY) { console.error('Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY'); process.exit(1) }

function preguntar(texto, oculto = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (oculto) rl._writeToOutput = (s) => { if (s.includes(texto)) rl.output.write(s) }
    rl.question(texto, (r) => { rl.close(); if (oculto) process.stdout.write('\n'); resolve(r.trim()) })
  })
}

const email = await preguntar('Correo de la cuenta: ')
const password = await preguntar('Contraseña (no se muestra): ', true)
const res = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const body = await res.json().catch(() => ({}))
if (res.ok && body.access_token) {
  console.log(`✅ Login correcto. profile_id=${body.user?.app_metadata?.profile_id} matrícula=${body.user?.user_metadata?.matricula}`)
} else {
  console.log(`❌ Login falló (${res.status}): ${body.error_description || body.msg || body.error || 'sin detalle'}`)
  process.exitCode = 1
}
