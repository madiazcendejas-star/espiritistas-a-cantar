export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
// Clave pública (publishable o anon). Se acepta cualquiera de los dos nombres.
export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function assertPublicEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }
}
