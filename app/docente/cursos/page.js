import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import { requireTeacher, cursosDelDocente, ESTADO_CURSO } from '@/lib/docente'
import { crearCursoDocente } from '../actions'

export const metadata = { title: 'Mis cursos' }

export default async function MisCursosDocente({ searchParams }) {
  const sp = await searchParams
  const { profile, db } = await requireTeacher()
  const cursos = await cursosDelDocente(db, profile.id)

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Portal docente</span>
          <h1>Mis cursos</h1>
          <p>Los cursos que propusiste y los grupos de EAC que tienes asignados.</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 38px' }}><span>Curso</span><span>Tipo</span><span>Estado</span><span /></div>
        {cursos.map((c) => {
          const [tono, texto] = c.propio ? ESTADO_CURSO[c.review_status] || ['neutral', c.review_status] : c.is_visible ? ['success', 'Publicado'] : ['neutral', 'Oculto']
          return (
            <Link key={c.id} href={`/docente/cursos/${c.id}`} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 38px' }}>
              <span><b>{c.title}</b>{c.review_status === 'rechazado' && c.review_notes && <small style={{ display: 'block', color: 'var(--rose)' }}>Cambios pedidos: {c.review_notes}</small>}</span>
              <span>{c.propio ? 'Propio' : `${c.gruposAsignados.length} grupo${c.gruposAsignados.length === 1 ? '' : 's'} asignado${c.gruposAsignados.length === 1 ? '' : 's'}`}</span>
              <span><i className={`status ${tono}`}>{texto}</i></span>
              <Icon name="chevron" size={16} />
            </Link>
          )
        })}
        {!cursos.length && <div className="empty-card" style={{ padding: 22 }}>Todavía no tienes cursos. Propón el primero abajo.</div>}
      </section>

      <div className="section-head" id="nuevo"><div><span className="eyebrow">Nuevo</span><h2>Proponer un curso</h2></div></div>
      <form action={crearCursoDocente} className="card" style={{ padding: 22 }}>
        <div className="grid2">
          <div className="field"><label>Nombre del curso</label><input name="title" required placeholder="Ej. Taller de lectura de runas" /></div>
          <div className="field">
            <label>Modalidad</label>
            <select name="modality" defaultValue="en_linea">
              <option value="en_linea">En línea (en vivo)</option><option value="grabado">Grabado</option><option value="presencial">Presencial</option><option value="mixto">Mixto</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Descripción</label><textarea name="description" rows={4} placeholder="¿De qué trata? ¿Para quién es?" /></div>
        <div className="field"><label>Temario / lo que aprenderán</label><textarea name="what_you_learn" rows={4} placeholder="Un tema por línea" /></div>
        <div className="grid2">
          <div className="field"><label>Duración</label><input name="duration_text" placeholder="Ej. 6 semanas" /></div>
          <div className="field"><label>Imagen de portada (enlace, opcional)</label><input name="cover_url" type="url" placeholder="https://…" /></div>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Se guarda como borrador. Después agregas las fechas y precios (grupos) y lo envías a revisión.</p>
        <button className="primary" type="submit"><Icon name="plus" size={18} /> Crear borrador</button>
      </form>
    </main>
  )
}
