import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionProfile } from '@/lib/auth'
import { crearCheckoutInscripcion, BARAJA_GRUPO_ID } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Compatible con la landing anterior: POST { grupo_id } → { url }.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const grupoId = Number(body.grupo_id || BARAJA_GRUPO_ID)
    const db = createAdminClient()
    const { data: grupo } = await db
      .from('course_groups')
      .select('id, course_id, name, price_total, installments, recurrence, status, courses(id, title, is_visible)')
      .eq('id', grupoId)
      .maybeSingle()
    if (!grupo || grupo.status !== 'activo' || !grupo.courses?.is_visible || !(Number(grupo.price_total) > 0)) {
      return NextResponse.json({ error: 'Este grupo no está disponible para inscripción en línea.' }, { status: 400 })
    }
    let perfil = null
    try {
      perfil = (await getSessionProfile()).profile
    } catch {}
    const url = await crearCheckoutInscripcion({ grupo, curso: grupo.courses, perfil })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Checkout', error)
    return NextResponse.json({ error: 'No pudimos iniciar el pago. Intenta de nuevo.' }, { status: 500 })
  }
}
