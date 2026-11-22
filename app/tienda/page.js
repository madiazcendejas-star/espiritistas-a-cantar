import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import ProductCard from '@/components/ProductCard'
import { getTienda } from '@/lib/tienda'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tienda · Ebooks y materiales', description: 'Ebooks, cuadernos de trabajo, mazos imprimibles y guías de EAC Academia. Descarga inmediata.' }

export default async function Tienda() {
  let productos = []
  try {
    productos = await getTienda()
  } catch {}
  return (
    <>
      <PublicHeader active="tienda" />
      <main className="pub-main">
        <section className="tienda-hero">
          <span className="eyebrow">Tienda EAC</span>
          <h1>Ebooks y materiales para tu práctica</h1>
          <p>Guías, cuadernos de trabajo y mazos imprimibles. Pagas con tarjeta u OXXO y quedan para siempre en tu biblioteca.</p>
        </section>
        {productos.length ? (
          <div className="product-grid">{productos.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        ) : (
          <div className="card empty-card" style={{ padding: 30 }}><b>Muy pronto</b>Estamos preparando los primeros materiales.</div>
        )}
      </main>
      <PublicFooter />
    </>
  )
}
