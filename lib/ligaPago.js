import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Liga de pago de una cuota sin iniciar sesión: /pagar/<id>.<firma>
// La firma (HMAC) impide adivinar ligas de otras personas.
const secreto = () => process.env.PAGO_LINK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const firma = (id) => createHmac('sha256', secreto()).update(`pago:${id}`).digest('base64url').slice(0, 22)

export const tokenPago = (id) => `${id}.${firma(id)}`

export function idDeToken(token) {
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{22})$/.exec(String(token || ''))
  if (!m || !secreto()) return null
  const a = Buffer.from(m[2])
  const b = Buffer.from(firma(m[1]))
  return a.length === b.length && timingSafeEqual(a, b) ? Number(m[1]) : null
}

// wa.me con número de México (10 dígitos → 52 + número).
export function waMe(numero, texto) {
  const d = String(numero || '').replace(/\D/g, '')
  const n = d.length === 10 ? `52${d}` : d
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null
}
