import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY, assertPublicEnv } from './env'

// Cliente sin sesión para el catálogo público (RLS: solo cursos visibles).
export function createPublicClient() {
  assertPublicEnv()
  return createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    db: { schema: 'app' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
