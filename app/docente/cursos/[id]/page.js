import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import TeacherGroupForm from '@/components/TeacherGroupForm'
import { requireTeacher, esAdmin, ESTADO_CURSO, porcentajeGeneral } from '@/lib/docente'
import { money, fechaDia, MODALIDAD } from '@/lib/format'
import { guardarCursoDocente, enviarARevision, eliminarGrupoDocente } from '../../actions'

export const metadata = { title: 'Curso' }

export default async function CursoDocente({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { profile, db } = await requireTeacher()
  const { data: c } = await db.from('courses').select('*').eq('id', id).maybeSingle()
  if (!c) notFound()

  const propio = c.owner_id === profile.id || (esAdmin(profile) && c.owner_id)
  const [{ data: todos }, { data: asignaciones }, { data: inscr }] = await Promise.all([
    db.from('course_groups').select('*').eq('course_id', id).order('starts_on', { ascending: true, nullsFirst: false }),
    db.from('group_teachers').select('group_id').eq('profile_id', profile.id),
    db.from('enrollments').select('group_id').eq('course_id', id).eq('status', 'activa'),
  ])
  const asignados = new Set((asignaciones || []).map((a) => a.group_id))
  const grupos = propio || esAdmin(profile) ? todos || [] : (todos || []).filter((g) => asignados.has(g.id))
  if (!propio && !esAdmin(profile) && !grupos.length) notFound()

  const editable = propio && ['borrador', 'rechazado'].includes(c.review_status)
  const n = (gid) => (inscr || []).filter((e) => e.group_id === gid).length
  const pct = c.teacher_share ?? (await porcentajeGeneral(db))
  const [tono, texto] = ESTADO_CURSO[c.review_status] || ['neutral', c.review_status]

  return (
    <main className="page">
      <Link href="/docente/cursos" className="back"><Icon name="chevron" size={16} /> Mis cursos</Link>
      <div className="greeting">
        <div>
          <span className="eyebrow">{propio ? 'Curso propio' : 'Curso de EAC'}</span>
          <h1>{c.title}</h1>
          <p>{propio ? <i className={`status ${tono}`}>{texto}</i> : 'Tienes grupos asignados en este curso.'}{c.review_status === 'aprobado' && <> · <Link href={`/cursos/${c.id}`} style={{ color: 'var(--purple)', fontWeight: 700 }}>Ver en el catálogo</Link></>}</p>
        </div>
        {editable && (
          <form action={enviarARevision}>
            <input type="hidden" name="id" value={c.id} />
            <button className="primary" type="submit"><Icon name="check" size={18} /> Enviar a revisión</button>
          </form>
        )}
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      {propio && c.review_status === 'rechazado' && c.review_notes && (
        <div className="notice danger" style={{ marginBottom: 16 }}><Icon name="info" /><span><b>Cambios que te pedimos:</b> {c.review_notes}</span></div>
      )}
      {propio && c.review_status === 'en_revision' && (
        <div className="notice info" style={{ marginBottom: 16 }}><Icon name="clock" /><span>Estamos revisando tu curso. Te avisaremos por correo en cuanto esté publicado o si necesita cambios.</span></div>
      )}
      {propio && c.review_status === 'borrador' && (
        <div className="notice info" style={{ marginBottom: 16 }}><Icon name="info" /><span>Es un borrador: solo tú lo ves. Completa la ficha, agrega al menos un grupo con precio y toca <b>Enviar a revisión</b>.</span></div>
      )}
      {propio && (
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Por cada pago recibes el <b>{Number(pct)} %</b> del monto, después de la comisión de la pasarela de pago.</p>
      )}

      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Grupos</span><h2>Fechas, precios y contenido</h2></div></div>
      <section className="card" style={{ padding: 0 }}>
        {grupos.map((g) => (
          <div key={g.id} className="admin-group">
            <span><b>{g.name}</b><small className="muted" style={{ display: 'block', fontSize: 12 }}>{MODALIDAD[g.modality] || g.modality}{g.schedule_text ? ` · ${g.schedule_text}` : ''}{g.starts_on ? ` · inicia ${fechaDia(g.starts_on)}` : ''}</small></span>
            <span>{money(g.price_total)}{g.installments > 1 ? ` en ${g.installments} pagos` : ''}</span>
            <span>{n(g.id)} inscritos · {g.status === 'activo' ? <i className="status success">Activo</i> : <i className="status neutral">{c.review_status === 'aprobado' ? 'Por activar' : 'Inactivo'}</i>}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <Link href={`/docente/grupos/${g.id}`} className="secondary sm">Materiales y clases <Icon name="chevron" size={14} /></Link>
            </span>
            {editable && (
              <details style={{ gridColumn: '1 / -1' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--purple)' }}>Editar grupo</summary>
                <div style={{ marginTop: 12 }}>
                  <TeacherGroupForm courseId={c.id} g={g} />
                  {!n(g.id) && (
                    <form action={eliminarGrupoDocente} style={{ marginTop: 8 }}>
                      <input type="hidden" name="id" value={g.id} /><input type="hidden" name="course_id" value={c.id} />
                      <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Eliminar grupo</button>
                    </form>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
        {!grupos.length && <div className="empty-card" style={{ padding: 22 }}>Aún no hay grupos. Agrega el primero abajo.</div>}
      </section>
      {propio && c.review_status !== 'en_revision' && (
        <details className="card" style={{ padding: 20, marginTop: 12 }} open={!grupos.length}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>+ Agregar un grupo (fecha y precio)</summary>
          {c.review_status === 'aprobado' && <p className="muted" style={{ fontSize: 13 }}>El grupo nuevo aparecerá en el catálogo cuando EAC lo active.</p>}
          <div style={{ marginTop: 14 }}><TeacherGroupForm courseId={c.id} /></div>
        </details>
      )}

      {propio && (
        <>
          <div className="section-head"><div><span className="eyebrow">Ficha del curso</span><h2>Lo que verán en el catálogo</h2></div></div>
          {editable ? (
            <form action={guardarCursoDocente} className="card" style={{ padding: 22 }}>
              <input type="hidden" name="id" value={c.id} />
              <div className="grid2">
                <div className="field"><label>Nombre del curso</label><input name="title" defaultValue={c.title} required /></div>
                <div className="field">
                  <label>Modalidad</label>
                  <select name="modality" defaultValue={c.modality || 'en_linea'}>
                    <option value="en_linea">En línea (en vivo)</option><option value="grabado">Grabado</option><option value="presencial">Presencial</option><option value="mixto">Mixto</option>
                  </select>
                </div>
              </div>
              <div className="field"><label>Descripción</label><textarea name="description" rows={4} defaultValue={c.description || ''} /></div>
              <div className="field"><label>Temario / lo que aprenderán</label><textarea name="what_you_learn" rows={5} defaultValue={c.what_you_learn || ''} /></div>
              <div className="grid2">
                <div className="field"><label>Duración</label><input name="duration_text" defaultValue={c.duration_text || ''} /></div>
                <div className="field"><label>Imagen de portada (enlace)</label><input name="cover_url" type="url" defaultValue={c.cover_url || ''} /></div>
              </div>
              <button className="primary" type="submit">Guardar cambios</button>
            </form>
          ) : (
            <section className="card" style={{ padding: 22 }}>
              <p className="prose" style={{ marginTop: 0 }}>{c.description || 'Sin descripción.'}</p>
              {c.what_you_learn && <p className="prose" style={{ whiteSpace: 'pre-line' }}>{c.what_you_learn}</p>}
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Para cambiar la ficha de un curso {c.review_status === 'aprobado' ? 'publicado' : 'en revisión'}, escríbenos.</p>
            </section>
          )}
        </>
      )}
    </main>
  )
}
