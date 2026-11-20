import 'server-only'
import { headers } from 'next/headers'

// En producción usamos el dominio oficial; en las vistas previas, la URL de la vista previa.
export async function urlDelSitio() {
  if (process.env.VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  if (!host) return (process.env.NEXT_PUBLIC_SITE_URL || 'https://espiritistasacantar.com').replace(/\/$/, '')
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
