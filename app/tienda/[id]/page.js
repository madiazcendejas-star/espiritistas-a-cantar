import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import Icon from '@/components/Icon'
import { getProducto, tieneProducto, TIPO_PRODUCTO, pesoArchivo } from '@/lib/tienda'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { money } from '@/lib/format'
import { comprarProducto } from '../actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { id } = await params
  const p = /^\d+$/.test(id) ? await getProducto(id).catch(() => null) : null
  return p ? { title: `${p.title} · Tienda`, description: p.subtitle || p.description?.slice(0, 150) } : { title: 'Tienda' }
}

export default async function Producto({ params, searchParams }) {
  const { id } = await params
  const { error } = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const p = await getProducto(id)
  if (!p?.file_path) notFound()
  let perfil = null
  try {
    perfil = (await getSessionProfile()).profile
  } catch {}
  const loTiene = perfil ? await tieneProducto(createAdminClient(), perfil.id, p.id) : false
  const gratis = !(Number(p.price) > 0)

  return (
    <>
      <PublicHeader active="tienda" />
      <main className="pub-main" style={{ paddingTop: 32 }}>
        <Link href="/tienda" className="back-home"><Icon name="chevron" size={16} /> Tienda</Link>
        <div className="producto-detalle">
          <div className="product-cover grande">
            {p.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_url} alt={`Portada de ${p.title}`} />
            ) : (
              <div className="product-cover-art"><span>{p.title}</span></div>
            )}
          </div>
          <div>
            <span className="eyebrow">{TIPO_PRODUCTO[p.kind] || 'Material'}</span>
            <h1>{p.title}</h1>
            {p.subtitle && <p className="producto-sub">{p.subtitle}</p>}
            <div className="chips" style={{ margin: '14px 0' }}>
              {p.author && <span className="chip">Por {p.author}</span>}
              {p.pages && <span className="chip">{p.pages} páginas</span>}
              <span className="chip">PDF{p.file_size ? ` · ${pesoArchivo(p.file_size)}` : ''}</span>
            </div>
            {p.description && <div className="prose" style={{ whiteSpace: 'pre-line' }}>{p.description}</div>}

            <section className="card producto-compra" id="comprar">
              {error && <div className="form-error" role="alert">{error}</div>}
              {loTiene ? (
                <>
                  <p style={{ margin: '0 0 12px' }}><Icon name="check" size={16} /> Ya está en tu biblioteca.</p>
                  <Link href={`/mi-espacio/biblioteca/${p.id}`} className="primary full"><Icon name="file" size={18} /> Leer ahora</Link>
                </>
              ) : (
                <form action={comprarProducto}>
                  <input type="hidden" name="product_id" value={p.id} />
                  <div className="producto-precio">{gratis ? <b>Gratis</b> : <><b>{money(p.price)}</b> <span>MXN</span></>}</div>
                  <button className="primary full" type="submit" style={{ minHeight: 52 }}>
                    <Icon name={gratis ? 'plus' : 'card'} size={18} /> {gratis ? 'Agregar a mi biblioteca' : 'Comprar'}
                  </button>
                  <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '10px 0 0' }}>
                    {gratis ? 'Necesitas iniciar sesión.' : 'Pago seguro con tarjeta u OXXO. Queda para siempre en tu biblioteca para leer o descargar.'}
                  </p>
                  {!perfil && !gratis && (
                    <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '6px 0 0' }}>
                      ¿Ya eres estudiante? <Link href={`/entrar?siguiente=/tienda/${p.id}`} style={{ color: 'var(--purple)', fontWeight: 700 }}>Inicia sesión primero</Link> para guardarlo en tu misma cuenta.
                    </p>
                  )}
                </form>
              )}
            </section>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
