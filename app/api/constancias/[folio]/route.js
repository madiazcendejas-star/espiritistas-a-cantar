import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { firmaConstancia } from '@/lib/constancias'
import { puedeGestionarGrupo } from '@/lib/docente'
import { crearConstanciaPdf } from '@/lib/constanciaPdf'
import { urlDelSitio } from '@/lib/sitio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    urlVerificacion: `${sitio}/constancia/${c.folio}`,
    urlCatalogo: `${sitio.replace(/^https?:\/\//, '')}/cursos`,
  })
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="constancia-${c.folio}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
