import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './env'

// SOLO SERVIDOR. Usa la secret key (no pasa por RLS). Nunca importar en componentes de cliente.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY')
  return createSupabaseClient(SUPABASE_URL, key, {
    db: { schema: 'app' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
