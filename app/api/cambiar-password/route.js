import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin'
import { passwordRegistrada, esperar } from '../../../lib/alumnoAuth'

export const dynamic = 'force-dynamic'

// Cambio de contraseña verificado en el servidor (requiere la contraseña actual).
export async function POST(req) {
  try {
    const { alumnoId, actual, nueva } = await req.json()
    const nuevaLimpia = String(nueva || '').trim()
    if (!alumnoId || !actual || nuevaLimpia.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()
    const { data: alumno, error } = await supabase.from('alumnos').select('*').eq('id', alumnoId).single()
    if (error || !alumno || String(actual).trim() !== passwordRegistrada(alumno)) {
      await esperar(600)
      return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 })
    }
    const { error: errUpd } = await supabase.from('alumnos').update({ password: nuevaLimpia }).eq('id', alumnoId)
    if (errUpd) throw errUpd
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Error en /api/cambiar-password', e)
    return NextResponse.json({ error: 'No se pudo actualizar la contraseña.' }, { status: 500 })
  }
}
