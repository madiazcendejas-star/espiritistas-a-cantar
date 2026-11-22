import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import GroupForm from '@/components/GroupForm'
import GroupContent from '@/components/GroupContent'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { agregarRecurso, eliminarRecurso, agregarSesion, actualizarSesion, eliminarSesion, asignarDocente, quitarDocente, marcarAsistencia } from '../../actions'

export const metadata = { title: 'Grupo' }

export default async function Grupo({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { db } = await requireAdmin()
  const { data: g } = await db.from('course_groups').select('*').eq('id', id).maybeSingle()
  if (!g) notFound()
  const [{ data: curso }, { data: recursos }, { data: sesiones }, { data: inscr }, { data: asignadosRaw }, { data: docentes }] = await Promise.all([
    db.from('courses').select('id, title').eq('id', g.course_id).single(),
    db.from('group_resources').select('*').eq('group_id', id).order('created_at').order('id'),
    db.from('live_sessions').select('*').eq('group_id', id).order('starts_at'),
    db.from('enrollments').select('profile_id, status').eq('group_id', id),
    db.from('group_teachers').select('profile_id, profiles(id, first_name, last_name)').eq('group_id', id),
    db.from('profiles').select('id, first_name, last_name').eq('role', 'teacher').order('first_name'),
  ])
  const asignados = (asignadosRaw || []).map((a) => a.profiles).filter(Boolean)
  const ids = (inscr || []).filter((e) => e.status === 'activa').map((e) => e.profile_id)
  const { data: personas } = ids.length ? await db.from('profiles').select('id, matricula, first_name, last_name').in('id', ids).order('first_name') : { data: [] }
  const sids = (sesiones || []).map((x) => x.id)
  const { data: asistencias } = sids.length ? await db.from('attendance').select('session_id, profile_id').in('session_id', sids) : { data: [] }
  const alumnos = (personas || []).map((x) => ({ id: x.id, nombre: nombreCompleto(x) }))

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

      <GroupContent groupId={id} recursos={recursos} sesiones={sesiones} alumnos={alumnos} asistencias={asistencias || []} acciones={{ agregarRecurso, eliminarRecurso, agregarSesion, actualizarSesion, eliminarSesion, marcarAsistencia }} />

      <DocentesAsignados groupId={g.id} asignados={asignados} docentes={docentes} />

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

function DocentesAsignados({ groupId, asignados, docentes }) {
  const libres = (docentes || []).filter((d) => !asignados.some((a) => a.id === d.id))
  return (
    <>
      <div className="section-head"><div><span className="eyebrow">Docentes</span><h2>Quién imparte este grupo</h2></div></div>
      <section className="card" style={{ padding: 18 }}>
        {asignados.length ? (
          <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
            {asignados.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <b>{nombreCompleto(d)}</b>
                <form action={quitarDocente}>
                  <input type="hidden" name="group_id" value={groupId} /><input type="hidden" name="profile_id" value={d.id} />
                  <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Quitar</button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Sin docente asignado. Quien se asigne verá este grupo en su portal y podrá subir materiales y programar clases.</p>
        )}
        {libres.length ? (
          <form action={asignarDocente} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input type="hidden" name="group_id" value={groupId} />
            <select name="profile_id" required defaultValue="" style={{ minWidth: 220 }}>
              <option value="" disabled>Elige docente…</option>
              {libres.map((d) => <option key={d.id} value={d.id}>{nombreCompleto(d)}</option>)}
            </select>
            <button className="primary sm" type="submit"><Icon name="plus" size={16} /> Asignar</button>
          </form>
        ) : (
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>Para asignar a alguien, primero apruébalo como docente en «Docentes».</p>
        )}
      </section>
    </>
  )
}
