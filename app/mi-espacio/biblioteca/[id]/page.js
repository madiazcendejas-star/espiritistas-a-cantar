import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Leer' }

// Lector dentro de la plataforma: el PDF se abre con un enlace firmado que caduca.
export default async function Leer({ params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  const { profile } = await getSessionProfile()
  const db = createAdminClient()
  const [{ data: compra }, { data: p }] = await Promise.all([
    db.from('product_purchases').select('id').eq('profile_id', profile.id).eq('product_id', id).maybeSingle(),
    db.from('products').select('id, title, file_path').eq('id', id).maybeSingle(),
  ])
  if ((!compra && profile.role !== 'admin') || !p?.file_path) notFound()
  const { data: firmado } = await db.storage.from('ebooks').createSignedUrl(p.file_path, 60 * 60)

  return (
    <main className="page">
      <Link href="/mi-espacio/biblioteca" className="back"><Icon name="chevron" size={16} /> Mi biblioteca</Link>
      <div className="greeting" style={{ marginBottom: 12 }}>
        <div><span className="eyebrow">Leyendo</span><h1 style={{ fontSize: 24 }}>{p.title}</h1></div>
        <a href={`/api/ebooks/${p.id}?descargar=1`} className="secondary"><Icon name="download" size={16} /> Descargar PDF</a>
      </div>
      {firmado?.signedUrl ? (
        <div className="lector-pdf">
          <iframe src={`${firmado.signedUrl}#view=FitH`} title={p.title} />
        </div>
      ) : (
        <div className="notice danger"><Icon name="info" /><span>No pudimos abrir el archivo. Intenta de nuevo o escríbenos.</span></div>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Si en tu celular no se ve aquí, toca «Descargar PDF» para abrirlo en tu lector.</p>
    </main>
  )
}
