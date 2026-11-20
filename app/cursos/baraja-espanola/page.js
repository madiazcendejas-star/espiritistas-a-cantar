import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BARAJA_GRUPO_ID } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// La liga de la app anterior (anuncios, WhatsApp) sigue funcionando: lleva al curso.
export default async function BarajaEspanola() {
  let cursoId = null
  try {
    const { data } = await createAdminClient().from('course_groups').select('course_id').eq('id', BARAJA_GRUPO_ID).maybeSingle()
    cursoId = data?.course_id
  } catch {}
  redirect(cursoId ? `/cursos/${cursoId}` : '/cursos')
}
