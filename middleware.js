import { NextResponse } from 'next/server'

// Protege todo /admin con usuario y contraseña verificados en el servidor.
// Configura ADMIN_USER y ADMIN_PASSWORD en Vercel (Settings → Environment Variables) ANTES de desplegar.
export const config = { matcher: ['/admin', '/admin/:path*'] }

function igualSeguro(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export function middleware(req) {
  const user = process.env.ADMIN_USER
  const pass = process.env.ADMIN_PASSWORD
  if (!user || !pass) {
    return new NextResponse('Panel de administración deshabilitado: faltan ADMIN_USER y ADMIN_PASSWORD.', { status: 503 })
  }
  const auth = req.headers.get('authorization') || ''
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6))
      const i = decoded.indexOf(':')
      const u = decoded.slice(0, i)
      const p = decoded.slice(i + 1)
      if (i > -1 && igualSeguro(u, user) && igualSeguro(p, pass)) return NextResponse.next()
    } catch (e) {}
  }
  return new NextResponse('Autenticación requerida', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="EAC Administracion", charset="UTF-8"' },
  })
}
