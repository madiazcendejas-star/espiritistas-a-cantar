import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import GroupForm from '@/components/GroupForm'
import { requireAdmin } from '@/lib/admin'
import { money, fechaDia, MODALIDAD, RECURRENCIA } from '@/lib/format'
import { guardarCurso, aprobarCurso, pedirCambiosCurso, guardarReparto } from '../../actions'
import { nombreCompleto } from '@/lib/admin'
import CamposCatalogo from '@/components/CamposCatalogo'

export const metadata = { title: 'Curso' }

export default async function Curso({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { db } = await requireAdmin()
  const { data: c } = await db.from('courses').select('*').eq('id', id).maybeSingle()
  if (!c) notFound()
  const [{ data: grupos }, { data: inscr }, { data: docentes }, { data: ajuste }] = await Promise.all([
    db.from('course_groups').select('*').eq('course_id', id).order('starts_on', { ascending: false, nullsFirst: false }),
    db.from('enrollments').select('group_id').eq('course_id', id).eq('status', 'activa'),
    db.from('profiles').select('id, first_name, last_name').eq('role', 'teacher').order('first_name'),
    db.from('settings').select('value').eq('key', 'docente_porcentaje').maybeSingle(),
  ])
  const dueno = (docentes || []).find((d) => d.id === c.owner_id)
  const pctGeneral = Number(ajuste?.value ?? 70)
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

      {c.review_status === 'en_revision' && (
        <section className="card" style={{ padding: 22, marginBottom: 16, borderColor: '#ecdcb6', background: 'var(--gold-soft)' }}>
          <span className="eyebrow">Revisión</span>
          <h2 style={{ fontWeight: 700, fontSize: 20, margin: '6px 0 6px' }}>Propuesta de {dueno ? nombreCompleto(dueno) : 'docente'}</h2>
          <p className="muted" style={{ marginTop: 0 }}>Revisa la ficha y los grupos de abajo. Al aprobar, el curso aparece en el catálogo con sus grupos activos.</p>
          <form action={aprobarCurso}>
            <input type="hidden" name="id" value={c.id} />
            <div className="field"><label>Comentarios para quien lo propuso (obligatorio si pides cambios)</label><textarea name="review_notes" rows={3} /></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="primary" type="submit"><Icon name="check" size={18} /> Aprobar y publicar</button>
              <button className="secondary" type="submit" formAction={pedirCambiosCurso}>Pedir cambios</button>
            </div>
          </form>
        </section>
      )}
      {c.review_status === 'rechazado' && (
        <div className="notice warn" style={{ marginBottom: 16 }}><Icon name="info" /><span>Le pediste cambios a quien lo propuso: {c.review_notes}</span></div>
      )}

      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Grupos</span><h2>Fechas, precios y modalidades</h2></div></div>
      <section className="card" style={{ padding: 0 }}>
        {(grupos || []).map((g) => (
          <Link key={g.id} href={`/admin/grupos/${g.id}`} className="admin-group">
            <span><b>{g.name}</b><small className="muted" style={{ display: 'block', fontSize: 12 }}>{MODALIDAD[g.modality] || g.modality}{g.schedule_text ? ` · ${g.schedule_text}` : ''}{g.starts_on ? ` · inicia ${fechaDia(g.starts_on)}` : ''}</small></span>
            <span>{money(g.price_total)}{g.recurrence ? ` / ${RECURRENCIA[g.recurrence]}` : g.installments > 1 ? ` en ${g.installments} pagos` : ''}</span>
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

      <div className="section-head"><div><span className="eyebrow">Docente</span><h2>Dueño del curso y reparto</h2></div></div>
      <form action={guardarReparto} className="card" style={{ padding: 22 }}>
        <input type="hidden" name="id" value={c.id} />
        <div className="grid2">
          <div className="field">
            <label>Curso de</label>
            <select name="owner_id" defaultValue={c.owner_id || ''}>
              <option value="">EAC (sin reparto)</option>
              {(docentes || []).map((d) => <option key={d.id} value={d.id}>{nombreCompleto(d)}</option>)}
            </select>
          </div>
          <div className="field"><label>% para el docente (vacío = general, hoy {pctGeneral} %)</label><input name="teacher_share" inputMode="decimal" defaultValue={c.teacher_share ?? ''} placeholder={String(pctGeneral)} /></div>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>Para los cursos de EAC deja «EAC». Si un docente de EAC solo imparte un grupo, asígnalo desde la página del grupo.</p>
        <button className="secondary" type="submit">Guardar reparto</button>
      </form>

      <div className="section-head"><div><span className="eyebrow">Ficha del curso</span><h2>Información del catálogo</h2></div></div>
      <form action={guardarCurso} className="card" style={{ padding: 22 }}>
        <input type="hidden" name="id" value={c.id} />
        <div className="grid2">
          <div className="field"><label>Nombre</label><input name="title" defaultValue={c.title} required /></div>
          <div className="field"><label>Precio base (MXN)</label><input name="price" inputMode="decimal" defaultValue={c.price} /></div>
        </div>
        <div className="field"><label>Descripción</label><textarea name="description" rows={4} defaultValue={c.description || ''} /></div>
        <div className="field"><label>Lo que aprenderás / temario</label><textarea name="what_you_learn" rows={4} defaultValue={c.what_you_learn || ''} /></div>
        <CamposCatalogo c={c} />
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
