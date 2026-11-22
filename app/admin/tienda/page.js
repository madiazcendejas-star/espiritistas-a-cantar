import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { TIPO_PRODUCTO } from '@/lib/tienda'
import { money, money2, fechaDia, hoyMx } from '@/lib/format'

export const metadata = { title: 'Tienda' }

export default async function TiendaAdmin({ searchParams }) {
  const sp = await searchParams
  const { db } = await requireAdmin()
  const [{ data: productos }, { data: ventas }] = await Promise.all([
    db.from('products').select('id, kind, title, price, is_visible, is_featured, file_path, cover_url').order('created_at', { ascending: false }),
    db.from('product_purchases').select('id, product_id, amount, source, purchased_on, profiles(id, first_name, last_name, matricula)').order('created_at', { ascending: false }).limit(200),
  ])
  const mes = hoyMx().slice(0, 7)
  const delMes = (ventas || []).filter((v) => String(v.purchased_on).startsWith(mes))
  const vendidos = (id) => (ventas || []).filter((v) => v.product_id === id).length
  const titulo = (id) => (productos || []).find((p) => p.id === id)?.title

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Tienda</span>
          <h1>Ebooks y materiales</h1>
          <p>{delMes.length} venta{delMes.length === 1 ? '' : 's'} este mes · {money2(delMes.reduce((a, v) => a + Number(v.amount), 0))}</p>
        </div>
        <Link href="/admin/tienda/nuevo" className="primary"><Icon name="plus" size={18} /> Nuevo material</Link>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '56px 2fr 1fr .8fr .8fr 1fr 38px' }}><span /><span>Material</span><span>Tipo</span><span className="right">Precio</span><span className="right">Ventas</span><span>Estado</span><span /></div>
        {(productos || []).map((p) => (
          <Link key={p.id} href={`/admin/tienda/${p.id}`} className="table-row" style={{ gridTemplateColumns: '56px 2fr 1fr .8fr .8fr 1fr 38px' }}>
            <span className="mini-portada">{p.cover_url ? <img src={p.cover_url} alt="" /> : <Icon name="file" size={18} />}</span>
            <span><b>{p.title}</b></span>
            <span>{TIPO_PRODUCTO[p.kind]}</span>
            <span className="right">{Number(p.price) > 0 ? money(p.price) : 'Gratis'}</span>
            <span className="right">{vendidos(p.id)}</span>
            <span>{!p.file_path ? <i className="status review">Falta PDF</i> : p.is_visible ? <i className="status success">En la tienda</i> : <i className="status neutral">Oculto</i>}{p.is_featured && <i className="status info" style={{ marginLeft: 6 }}>Destacado</i>}</span>
            <Icon name="chevron" size={16} />
          </Link>
        ))}
        {!productos?.length && <div className="empty-card" style={{ padding: 22 }}>Aún no hay materiales. Crea el primero con «Nuevo material».</div>}
      </section>

      <div className="section-head"><div><span className="eyebrow">Ventas</span><h2>Últimas compras</h2></div></div>
      <section className="table-panel">
        {(ventas || []).slice(0, 40).map((v) => (
          <div key={v.id} className="table-row" style={{ gridTemplateColumns: '1fr 1.6fr 2fr .9fr .9fr' }}>
            <span>{fechaDia(v.purchased_on)}</span>
            <span><Link href={`/admin/estudiantes/${v.profiles?.id}`} style={{ fontWeight: 600 }}>{nombreCompleto(v.profiles)}</Link></span>
            <span>{titulo(v.product_id)}</span>
            <span className="right">{money2(v.amount)}</span>
            <span>{v.source === 'compra' ? <i className="status success">En línea</i> : v.source === 'manual' ? <i className="status info">Manual</i> : <i className="status neutral">Regalo</i>}</span>
          </div>
        ))}
        {!ventas?.length && <div className="empty-card" style={{ padding: 20 }}>Todavía no hay compras.</div>}
      </section>
    </main>
  )
}
