import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import GroupForm from '@/components/GroupForm'
import { requireAdmin } from '@/lib/admin'
import { money, fechaDia, MODALIDAD } from '@/lib/format'
import { guardarCurso } from '../../actions'

export const metadata = { title: 'Curso' }

export default async function Curso({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { db } = await requireAdmin()
  const { data: c } = await db.from('courses').select('*').eq('id', id).maybeSingle()
  if (!c) notFound()
  const [{ data: grupos }, { data: inscr }] = await Promise.all([
    db.from('course_groups').select('*').eq('course_id', id).order('starts_on', { ascending: false, nullsFirst: false }),
    db.from('enrollments').select('group_id').eq('course_id', id).eq('status', 'activa'),
  ])
  const n = (gid) => (inscr || []).filter((e) => e.group_id === gid).length

  return (
    <main className="page">
      <Link href="/admin/cursos" className="back"><Icon name="chevron" size={16} /> Cursos</Link>
      <div className="greeting">
        <div>
          <span className="eyebrow">Curso</span>
          <h1>{c.title}</h1>
          <p>{c.is_visible ? 'Visible en el catálogo' : 'Oculto del catálogo'} · <Link href={`/cursos/${c.id}`} style={{ color: 'var(--purple)', fontWeight: 700 }}>Ver ficha pública</Link></p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Grupos</span><h2>Fechas, precios y modalidades</h2></div></div>
      <section className="card" style={{ padding: 0 }}>
        {(grupos || []).map((g) => (
          <Link key={g.id} href={`/admin/grupos/${g.id}`} className="admin-group">
            <span><b>{g.name}</b><small className="muted" style={{ display: 'block', fontSize: 12 }}>{MODALIDAD[g.modality] || g.modality}{g.schedule_text ? ` · ${g.schedule_text}` : ''}{g.starts_on ? ` · inicia ${fechaDia(g.starts_on)}` : ''}</small></span>
            <span>{money(g.price_total)}{g.installments > 1 ? ` en ${g.installments} pagos` : ''}</span>
            <span>{n(g.id)} inscritos · {g.status === 'activo' ? <i className="status success">Activo</i> : <i className="status neutral">Inactivo</i>}</span>
            <span className="secondary sm">Materiales y sesiones <Icon name="chevron" size={14} /></span>
          </Link>
        ))}
        {!grupos?.length && <div className="empty-card" style={{ padding: 22 }}>Aún no hay grupos. Crea el primero abajo.</div>}
      </section>
      <details className="card" style={{ padding: 20, marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>+ Crear un grupo nuevo</summary>
        <div style={{ marginTop: 14 }}><GroupForm courseId={c.id} /></div>
      </details>

      <div className="section-head"><div><span className="eyebrow">Ficha del curso</span><h2>Información del catálogo</h2></div></div>
      <form action={guardarCurso} className="card" style={{ padding: 22 }}>
        <input type="hidden" name="id" value={c.id} />
        <div className="grid2">
          <div className="field"><label>Nombre</label><input name="title" defaultValue={c.title} required /></div>
          <div className="field"><label>Precio base (MXN)</label><input name="price" inputMode="decimal" defaultValue={c.price} /></div>
        </div>
        <div className="field"><label>Descripción</label><textarea name="description" rows={4} defaultValue={c.description || ''} /></div>
        <div className="field"><label>Lo que aprenderás / temario</label><textarea name="what_you_learn" rows={4} defaultValue={c.what_you_learn || ''} /></div>
        <div className="grid3">
          <div className="field"><label>Duración</label><input name="duration_text" defaultValue={c.duration_text || ''} placeholder="Ej. 8 semanas" /></div>
          <div className="field"><label>Imagen de portada (URL)</label><input name="cover_url" defaultValue={c.cover_url || ''} /></div>
          <div className="field"><label>Manual PDF (URL de Drive)</label><input name="manual_pdf_url" defaultValue={c.manual_pdf_url || ''} /></div>
        </div>
        <div className="switches">
          <label><input type="checkbox" name="is_visible" defaultChecked={c.is_visible} /> Mostrar en el catálogo</label>
          <label><input type="checkbox" name="is_upcoming" defaultChecked={c.is_upcoming} /> Próximamente</label>
          <label><input type="checkbox" name="is_featured" defaultChecked={c.is_featured} /> Destacado en el inicio</label>
        </div>
        <button className="primary" type="submit">Guardar curso</button>
      </form>
    </main>
  )
}
