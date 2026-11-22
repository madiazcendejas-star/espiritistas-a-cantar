import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Descarga protegida: solo quien lo compró (o administración) recibe un
// enlace firmado que caduca en 2 minutos.
export async function GET(req, { params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return new NextResponse('No encontrado', { status: 404 })
  let profile = null
  try {
    profile = (await getSessionProfile()).profile
  } catch {}
  if (!profile) return NextResponse.redirect(new URL(`/entrar?siguiente=/mi-espacio/biblioteca`, req.url))

  const db = createAdminClient()
  const [{ data: compra }, { data: p }] = await Promise.all([
    db.from('product_purchases').select('id, download_count').eq('profile_id', profile.id).eq('product_id', id).maybeSingle(),
    db.from('products').select('title, file_path, file_name').eq('id', id).maybeSingle(),
  ])
  if ((!compra && profile.role !== 'admin') || !p?.file_path) return new NextResponse('No encontrado', { status: 404 })

  const nombre = (p.file_name || `${p.title}.pdf`).replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, '')
  const { data, error } = await db.storage.from('ebooks').createSignedUrl(p.file_path, 120, { download: nombre })
  if (error || !data?.signedUrl) return new NextResponse('No se pudo generar la descarga', { status: 500 })
  if (compra) await db.from('product_purchases').update({ download_count: (compra.download_count || 0) + 1, last_download_at: new Date().toISOString() }).eq('id', compra.id)
  return NextResponse.redirect(data.signedUrl)
}
