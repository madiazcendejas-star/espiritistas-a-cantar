import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { firmaConstancia } from '@/lib/constancias'
import { puedeGestionarGrupo } from '@/lib/docente'
import { crearConstanciaPdf } from '@/lib/constanciaPdf'
import { urlDelSitio } from '@/lib/sitio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Segunda firma: quien imparte el grupo (asignado) o es dueño del curso.
async function docenteDe(db, c) {
  const nombre = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(' ')
  if (c.group_id) {
    const { data } = await db.from('group_teachers').select('profiles(first_name, last_name)').eq('group_id', c.group_id).limit(1)
    if (data?.[0]?.profiles) return nombre(data[0].profiles)
  }
  const { data: curso } = await db.from('courses').select('profiles!courses_owner_id_fkey(first_name, last_name)').eq('id', c.course_id).maybeSingle()
  return curso?.profiles ? nombre(curso.profiles) : null
}

// Descarga del PDF: la persona dueña, administración o su docente.
export async function GET(_req, { params }) {
  const { folio } = await params
  if (!/^EAC-[A-Z0-9]{4,12}$/.test(folio)) return new NextResponse('No encontrada', { status: 404 })
  let ctx
  try {
    ctx = await getSessionProfile()
  } catch {
    ctx = {}
  }
  if (!ctx.profile) return NextResponse.redirect(new URL(`/entrar?siguiente=/mi-espacio/logros`, _req.url))

  const db = createAdminClient()
  const { data: c } = await db.from('certificates').select('*').eq('folio', folio).is('revoked_at', null).maybeSingle()
  if (!c) return new NextResponse('No encontrada', { status: 404 })
  const permitido = c.profile_id === ctx.profile.id || ctx.profile.role === 'admin' || (c.group_id && ctx.profile.role === 'teacher' && (await puedeGestionarGrupo(db, ctx.profile, c.group_id)))
  if (!permitido) return new NextResponse('No encontrada', { status: 404 })

  const sitio = await urlDelSitio()
  const bytes = await crearConstanciaPdf(c, {
    ...(await firmaConstancia(db)),
    docente: await docenteDe(db, c),
    urlVerificacion: `${sitio}/constancia/${c.folio}`,
  })
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="constancia-${c.folio}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
