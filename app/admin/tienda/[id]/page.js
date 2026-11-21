import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import SubirArchivo from '@/components/SubirArchivo'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { pesoArchivo } from '@/lib/tienda'
import { money2, fechaDia } from '@/lib/format'
import { guardarProducto, darAccesoProducto } from '../actions'

export const metadata = { title: 'Material' }

export default async function ProductoAdmin({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  const nuevo = id === 'nuevo'
  if (!nuevo && !/^\d+$/.test(id)) notFound()
  const { db } = await requireAdmin()
  let p = null
  let compras = []
  if (!nuevo) {
    const [{ data }, { data: c }] = await Promise.all([
      db.from('products').select('*').eq('id', id).maybeSingle(),
      db.from('product_purchases').select('id, amount, source, purchased_on, download_count, profiles(id, first_name, last_name, matricula)').eq('product_id', id).order('created_at', { ascending: false }),
    ])
    if (!data) notFound()
    p = data
    compras = c || []
  }

  return (
    <main className="page" style={{ maxWidth: 980 }}>
      <Link href="/admin/tienda" className="back"><Icon name="chevron" size={16} /> Tienda</Link>
      <div className="greeting">
        <div>
          <span className="eyebrow">{nuevo ? 'Nuevo material' : 'Material'}</span>
          <h1>{p?.title || 'Nuevo material'}</h1>
          {p && <p>{compras.length} en bibliotecas · {money2(compras.reduce((a, c) => a + Number(c.amount), 0))} vendidos{p.is_visible && <> · <Link href={`/tienda/${p.id}`} style={{ color: 'var(--purple)', fontWeight: 700 }}>Ver en la tienda</Link></>}</p>}
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <form action={guardarProducto} className="card" style={{ padding: 22 }}>
        {p && <input type="hidden" name="id" value={p.id} />}
        <div className="grid2">
          <div className="field"><label>Título</label><input name="title" defaultValue={p?.title || ''} required /></div>
          <div className="field">
            <label>Tipo</label>
            <select name="kind" defaultValue={p?.kind || 'ebook'}>
              <option value="ebook">Ebook</option><option value="workbook">Cuaderno de trabajo</option><option value="mazo">Mazo imprimible</option><option value="guia">Guía</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Subtítulo (una línea)</label><input name="subtitle" defaultValue={p?.subtitle || ''} /></div>
        <div className="field"><label>Descripción</label><textarea name="description" rows={6} defaultValue={p?.description || ''} placeholder="¿Qué contiene? ¿Para quién es?" /></div>
        <div className="grid3">
          <div className="field"><label>Autor/a</label><input name="author" defaultValue={p?.author || ''} /></div>
          <div className="field"><label>Páginas</label><input name="pages" inputMode="numeric" defaultValue={p?.pages ?? ''} /></div>
          <div className="field"><label>Precio (MXN, 0 = gratis)</label><input name="price" inputMode="decimal" defaultValue={p?.price ?? ''} required /></div>
        </div>
        <div className="grid2">
          <div className="field">
            <label>Archivo PDF</label>
            <SubirArchivo bucket="ebooks" accept="application/pdf,.pdf" etiqueta="El PDF" actual={p?.file_name ? `${p.file_name}${p.file_size ? ` (${pesoArchivo(p.file_size)})` : ''}` : null} />
          </div>
          <div className="field">
            <label>Portada (imagen vertical, opcional)</label>
            <SubirArchivo bucket="portadas" accept="image/png,image/jpeg,image/webp" etiqueta="La portada" actual={p?.cover_url ? 'imagen cargada' : null} />
            {p?.cover_url && <input type="hidden" name="cover_url" value={p.cover_url} />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', margin: '6px 0 16px' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" name="is_visible" defaultChecked={p?.is_visible} /> Publicar en la tienda</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" name="is_featured" defaultChecked={p?.is_featured} /> Destacado (aparece primero)</label>
        </div>
        <button className="primary" type="submit">Guardar</button>
      </form>

      {p && (
        <>
          <div className="section-head"><div><span className="eyebrow">Acceso</span><h2>Dar acceso sin pago en línea</h2></div></div>
          <form action={darAccesoProducto} className="card inline-form" style={{ padding: 18 }}>
            <input type="hidden" name="product_id" value={p.id} />
            <div className="field" style={{ marginBottom: 0, flex: 2 }}><label>Matrícula, correo o teléfono</label><input name="persona" required /></div>
            <div className="field" style={{ marginBottom: 0, flex: 1 }}><label>Monto recibido (0 = regalo)</label><input name="amount" inputMode="decimal" defaultValue="0" /></div>
            <button className="primary" type="submit"><Icon name="plus" size={18} /> Dar acceso</button>
          </form>

          <div className="section-head"><div><span className="eyebrow">Compras</span><h2>Quién lo tiene</h2></div></div>
          <section className="table-panel">
            {compras.map((c) => (
              <div key={c.id} className="table-row" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr' }}>
                <span>{fechaDia(c.purchased_on)}</span>
                <span><Link href={`/admin/estudiantes/${c.profiles?.id}`} style={{ fontWeight: 600 }}>{nombreCompleto(c.profiles)}</Link> <small className="muted">{c.profiles?.matricula}</small></span>
                <span className="right">{money2(c.amount)}</span>
                <span>{c.source === 'compra' ? 'En línea' : c.source === 'manual' ? 'Manual' : 'Regalo'}</span>
                <span className="muted">{c.download_count} descarga{c.download_count === 1 ? '' : 's'}</span>
              </div>
            ))}
            {!compras.length && <div className="empty-card" style={{ padding: 20 }}>Nadie lo tiene todavía.</div>}
          </section>
        </>
      )}
    </main>
  )
}
