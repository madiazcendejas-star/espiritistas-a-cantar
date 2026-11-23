import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { correrColegiaturas } from '@/lib/colegiaturas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Lo llama Vercel Cron una vez al día (vercel.json). Vercel manda
// «Authorization: Bearer <CRON_SECRET>» si la variable CRON_SECRET existe.
export async function GET(req) {
  const secreto = process.env.CRON_SECRET
  if (!secreto || req.headers.get('authorization') !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const r = await correrColegiaturas(createAdminClient())
    return NextResponse.json(r)
  } catch (e) {
    console.error('Cron colegiaturas', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
