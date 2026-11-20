import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY, assertPublicEnv } from './env'

// Cliente con la sesión del usuario (respeta RLS). Para Server Components,
// Server Actions y Route Handlers.
export async function createClient() {
  // cookies() primero: marca la página como dinámica antes de validar variables.
  const cookieStore = await cookies()
  assertPublicEnv()
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    db: { schema: 'app' },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // En Server Components no se pueden escribir cookies; el middleware renueva la sesión.
        }
      },
    },
  })
}
