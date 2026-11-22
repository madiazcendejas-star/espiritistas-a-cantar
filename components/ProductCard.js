import Link from 'next/link'
import { money } from '@/lib/format'

const TIPO = { ebook: 'Ebook', workbook: 'Cuaderno de trabajo', mazo: 'Mazo imprimible', guia: 'Guía' }

export default function ProductCard({ p, href }) {
  return (
    <Link href={href || `/tienda/${p.id}`} className="product-card">
      <div className="product-cover">
        {p.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_url} alt="" loading="lazy" />
        ) : (
          <div className="product-cover-art"><span>{p.title}</span></div>
        )}
      </div>
      <div className="product-body">
        <span className="chip">{TIPO[p.kind] || 'Material'}</span>
        <h3>{p.title}</h3>
        {p.subtitle && <p>{p.subtitle}</p>}
        <span className="price">{Number(p.price) > 0 ? <><b>{money(p.price)}</b> MXN</> : <b>Gratis</b>}</span>
      </div>
    </Link>
  )
}
