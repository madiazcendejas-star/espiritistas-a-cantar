import Link from 'next/link'
import Icon from '@/components/Icon'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { TIPO_PRODUCTO } from '@/lib/tienda'
import { fechaDia } from '@/lib/format'

export const metadata = { title: 'Mi biblioteca' }

export default async function Biblioteca() {
  const { profile } = await getSessionProfile()
  const { data } = await createAdminClient().from('product_purchases')
    .select('purchased_on, products(id, kind, title, subtitle, cover_url, pages)')
    .eq('profile_id', profile.id).order('purchased_on', { ascending: false })
  const items = (data || []).filter((x) => x.products)

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Tu biblioteca</span>
          <h1>Mis ebooks y materiales</h1>
          <p>Todo lo que has comprado en la tienda, para leer o descargar cuando quieras.</p>
        </div>
        <Link href="/tienda" className="secondary"><Icon name="book" size={16} /> Ir a la tienda</Link>
      </div>
      {items.length ? (
        <div className="product-grid">
          {items.map(({ products: p, purchased_on }) => (
            <article key={p.id} className="product-card">
              <Link href={`/mi-espacio/biblioteca/${p.id}`} className="product-cover">
                {p.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_url} alt="" loading="lazy" />
                ) : <div className="product-cover-art"><span>{p.title}</span></div>}
              </Link>
              <div className="product-body">
                <span className="chip">{TIPO_PRODUCTO[p.kind] || 'Material'}</span>
                <h3>{p.title}</h3>
                <p>Desde el {fechaDia(purchased_on)}{p.pages ? ` · ${p.pages} págs.` : ''}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                  <Link href={`/mi-espacio/biblioteca/${p.id}`} className="primary sm" style={{ flex: 1, justifyContent: 'center' }}>Leer</Link>
                  <a href={`/api/ebooks/${p.id}?descargar=1`} className="secondary sm" aria-label="Descargar" title="Descargar PDF"><Icon name="download" size={16} /></a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty-card" style={{ padding: 28 }}>
          <Icon name="book" size={28} />
          <b>Aún no tienes materiales</b>
          Descubre ebooks, cuadernos de trabajo y mazos imprimibles en la tienda.
          <Link href="/tienda" className="primary sm" style={{ marginTop: 10 }}>Ver la tienda</Link>
        </div>
      )}
    </main>
  )
}
