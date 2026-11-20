import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import { requireAdmin } from '@/lib/admin'
import { money } from '@/lib/format'
import { guardarCurso } from '../actions'

export const metadata = { title: 'Cursos y grupos' }

export default async function Cursos({ searchParams }) {
  const sp = await searchParams
  const { db } = await requireAdmin()
  const [{ data: cursos }, { data: grupos }, { data: inscr }] = await Promise.all([
    db.from('courses').select('id, title, price, is_visible, is_upcoming, cover_url, owner_id, review_status').neq('review_status', 'borrador').order('title'),
    db.from('course_groups').select('id, course_id, status'),
    db.from('enrollments').select('course_id').eq('status', 'activa'),
  ])
  const nGrupos = (id) => (grupos || []).filter((g) => g.course_id === id && g.status === 'activo').length
  const nInscr = (id) => (inscr || []).filter((e) => e.course_id === id).length

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1>Cursos y grupos</h1>
          <p>Cada curso tiene sus grupos: versiones con su propia fecha, precio y modalidad.</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />
      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '2.2fr .8fr .8fr .8fr 1fr 38px' }}>
          <span>Curso</span><span className="right">Precio base</span><span className="right">Grupos activos</span><span className="right">Inscritos</span><span>Catálogo</span><span />
        </div>
        {(cursos || []).map((c) => (
          <Link key={c.id} href={`/admin/cursos/${c.id}`} className="table-row" style={{ gridTemplateColumns: '2.2fr .8fr .8fr .8fr 1fr 38px' }}>
            <span className="course-cell"><span className="tiny-art">✦</span><b>{c.title}</b></span>
            <span className="right">{money(c.price)}</span>
            <span className="right">{nGrupos(c.id)}</span>
            <span className="right">{nInscr(c.id)}</span>
            <span>{c.review_status === 'en_revision' ? <i className="status review">Por revisar</i> : c.review_status === 'rechazado' ? <i className="status danger">Cambios pedidos</i> : c.is_visible ? <i className="status success">Visible</i> : <i className="status neutral">Oculto</i>}{c.is_upcoming && <i className="status review" style={{ marginLeft: 6 }}>Próximamente</i>}{c.owner_id && <i className="status info" style={{ marginLeft: 6 }}>Docente</i>}</span>
            <Icon name="chevron" size={17} />
          </Link>
        ))}
      </section>

      <details className="card" style={{ padding: 20, marginTop: 16 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>+ Crear un curso nuevo</summary>
        <form action={guardarCurso} style={{ marginTop: 14 }}>
          <div className="grid2">
            <div className="field"><label>Nombre del curso</label><input name="title" required /></div>
            <div className="field"><label>Precio base (MXN)</label><input name="price" inputMode="decimal" defaultValue="0" /></div>
          </div>
          <div className="field"><label>Descripción</label><textarea name="description" rows={3} /></div>
          <div className="switches"><label><input type="checkbox" name="is_visible" /> Mostrar en el catálogo</label><label><input type="checkbox" name="is_upcoming" /> Marcar como próximamente</label></div>
          <button className="primary" type="submit"><Icon name="plus" size={18} /> Crear curso</button>
        </form>
      </details>
    </main>
  )
}
