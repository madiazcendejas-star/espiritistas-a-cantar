import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import GroupForm from '@/components/GroupForm'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { fechaLarga, hora } from '@/lib/format'
import { toEmbed } from '@/lib/embed'
import { agregarRecurso, eliminarRecurso, agregarSesion, actualizarSesion, eliminarSesion } from '../../actions'

export const metadata = { title: 'Grupo' }

export default async function Grupo({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { db } = await requireAdmin()
  const { data: g } = await db.from('course_groups').select('*').eq('id', id).maybeSingle()
  if (!g) notFound()
  const [{ data: curso }, { data: recursos }, { data: sesiones }, { data: inscr }] = await Promise.all([
    db.from('courses').select('id, title').eq('id', g.course_id).single(),
    db.from('group_resources').select('*').eq('group_id', id).order('created_at').order('id'),
    db.from('live_sessions').select('*').eq('group_id', id).order('starts_at'),
    db.from('enrollments').select('profile_id, status').eq('group_id', id),
  ])
  const ids = (inscr || []).filter((e) => e.status === 'activa').map((e) => e.profile_id)
  const { data: personas } = ids.length ? await db.from('profiles').select('id, matricula, first_name, last_name').in('id', ids).order('first_name') : { data: [] }
  const ahora = Date.now()

  return (
    <main className="page">
      <Link href={`/admin/cursos/${g.course_id}`} className="back"><Icon name="chevron" size={16} /> {curso?.title}</Link>
      <div className="greeting">
        <div>
          <span className="eyebrow">Grupo</span>
          <h1>{g.name}</h1>
          <p>{curso?.title} · {ids.length} inscritos con acceso</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Material</span><h2>Clases grabadas y PDFs</h2></div></div>
      <div className="resources" style={{ marginTop: 0 }}>
        {(recursos || []).map((r) => (
          <div key={r.id} className="resource">
            <span className="r-icon" style={r.kind === 'pdf' ? undefined : { background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name={r.kind === 'pdf' ? 'file' : 'play'} /></span>
            <div>
              <b>{r.title}</b>
              <small>{r.kind === 'pdf' ? 'PDF' : 'Clase grabada'} · {toEmbed(r.url) ? 'se ve dentro de EAC' : 'se abre aparte (enlace no compatible)'}</small>
            </div>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="ghost sm">Abrir</a>
            <form action={eliminarRecurso}>
              <input type="hidden" name="id" value={r.id} /><input type="hidden" name="group_id" value={id} />
              <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Quitar</button>
            </form>
          </div>
        ))}
        {!recursos?.length && <div className="card empty-card" style={{ padding: 20 }}>Sin materiales todavía.</div>}
      </div>
      <form action={agregarRecurso} className="card" style={{ padding: 18, marginTop: 12 }}>
        <input type="hidden" name="group_id" value={id} />
        <div className="grid3">
          <div className="field"><label>Título</label><input name="title" required placeholder="Ej. Clase 3: Plantas protectoras" /></div>
          <div className="field"><label>Tipo</label><select name="kind" defaultValue="video"><option value="video">Clase grabada (video)</option><option value="pdf">Documento PDF</option></select></div>
          <div className="field"><label>Enlace (Drive, YouTube, Vimeo)</label><input name="url" type="url" required placeholder="https://drive.google.com/file/d/…" /></div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>En Drive, comparte el archivo como «Cualquier persona con el enlace» para que se vea dentro de EAC.</p>
        <button className="primary" type="submit"><Icon name="plus" size={18} /> Agregar material</button>
      </form>

      <div className="section-head"><div><span className="eyebrow">Clases en vivo</span><h2>Sesiones del grupo</h2></div></div>
      <div className="stack">
        {(sesiones || []).map((s) => {
          const pasada = new Date(s.starts_at).getTime() < ahora
          return (
            <details key={s.id} className="card" style={{ padding: 0 }}>
              <summary className="pay-sum" style={{ cursor: 'pointer' }}>
                <span><b>Sesión {s.number}: {s.title}</b></span>
                <span style={{ fontSize: 13 }}>{fechaLarga(s.starts_at)}, {hora(s.starts_at)}</span>
                <span>{s.meet_url ? <i className="status success">Con Meet</i> : <i className="status review">Sin Meet</i>}</span>
                <span>{pasada ? (s.recording_url ? <i className="status info">Grabación</i> : <i className="status neutral">Pasada</i>) : <i className="status success">Próxima</i>}</span>
                <span className="secondary sm">Editar</span>
              </summary>
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--line)' }}>
                <form action={actualizarSesion} style={{ marginTop: 14 }}>
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="group_id" value={id} />
                  <div className="grid2">
                    <div className="field"><label>Enlace de Google Meet</label><input name="meet_url" defaultValue={s.meet_url || ''} placeholder="https://meet.google.com/…" /></div>
                    <div className="field"><label>Grabación (después de la clase)</label><input name="recording_url" defaultValue={s.recording_url || ''} placeholder="https://drive.google.com/file/d/…" /></div>
                  </div>
                  <button className="primary sm" type="submit">Guardar</button>
                </form>
                <form action={eliminarSesion} style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="group_id" value={id} />
                  <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Eliminar sesión</button>
                </form>
              </div>
            </details>
          )
        })}
        {!sesiones?.length && <div className="card empty-card" style={{ padding: 20 }}>Sin sesiones programadas.</div>}
      </div>
      <form action={agregarSesion} className="card" style={{ padding: 18, marginTop: 12 }}>
        <input type="hidden" name="group_id" value={id} />
        <div className="grid3">
          <div className="field"><label>Título</label><input name="title" required placeholder="Ej. Círculo de integración" /></div>
          <div className="field"><label>Fecha</label><input type="date" name="fecha" required /></div>
          <div className="field"><label>Hora (Ciudad de México)</label><input type="time" name="hora" required /></div>
        </div>
        <div className="field"><label>Enlace de Google Meet</label><input name="meet_url" placeholder="https://meet.google.com/…" /></div>
        <button className="primary" type="submit"><Icon name="plus" size={18} /> Programar sesión</button>
      </form>

      <div className="section-head"><div><span className="eyebrow">Estudiantes</span><h2>Inscritos con acceso</h2></div></div>
      <section className="table-panel">
        {(personas || []).map((p) => (
          <Link key={p.id} href={`/admin/estudiantes/${p.id}`} className="table-row" style={{ gridTemplateColumns: '.8fr 2fr 38px', minHeight: 54 }}>
            <span><b style={{ color: 'var(--purple-dark)' }}>{p.matricula}</b></span><span>{nombreCompleto(p)}</span><Icon name="chevron" size={16} />
          </Link>
        ))}
        {!personas?.length && <div className="empty-card" style={{ padding: 20 }}>Sin inscritos.</div>}
      </section>

      <div className="section-head"><div><span className="eyebrow">Configuración</span><h2>Datos del grupo</h2></div></div>
      <div className="card" style={{ padding: 22 }}><GroupForm courseId={g.course_id} g={g} /></div>
    </main>
  )
}
