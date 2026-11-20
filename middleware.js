import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PRIVADAS = ['/mi-espacio', '/docente', '/admin']

// Renueva la sesión de Supabase en cada petición y manda al login a quien
// entra a una zona privada sin sesión. El rol se verifica en cada layout.
export async function middleware(request) {
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && PRIVADAS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const destino = request.nextUrl.clone()
    destino.pathname = '/entrar'
    destino.search = `?siguiente=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(destino)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|logo-eac.png|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
}
