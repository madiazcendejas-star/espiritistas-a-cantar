import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import GroupContent from '@/components/GroupContent'
import { requireTeacher, puedeGestionarGrupo } from '@/lib/docente'
import { nombreCompleto } from '@/lib/admin'
import { fechaDia, hoyMx } from '@/lib/format'
import { agregarRecursoDocente, eliminarRecursoDocente, agregarSesionDocente, actualizarSesionDocente, eliminarSesionDocente, emitirConstanciaDocente, marcarAsistenciaDocente } from '../../actions'

export const metadata = { title: 'Grupo' }

const ACCESO = { activo: ['success', 'Activo'], pausado: ['danger', 'Pausado'], sin_acceso: ['neutral', 'Sin acceso'] }

export default async function GrupoDocente({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { profile, db } = await requireTeacher()
  if (!(await puedeGestionarGrupo(db, profile, Number(id)))) notFound()
  const { data: g } = await db.from('course_groups').select('*, courses(id, title)').eq('id', id).maybeSingle()
  if (!g) notFound()

  const [{ data: recursos }, { data: sesiones }, { data: inscr }, { data: vencidas }, { data: certs }] = await Promise.all([
    db.from('group_resources').select('*').eq('group_id', id).order('created_at').order('id'),
    db.from('live_sessions').select('*').eq('group_id', id).order('starts_at'),
    db.from('enrollments').select('profile_id, enrolled_at, profiles(id, matricula, first_name, last_name)').eq('group_id', id).eq('status', 'activa'),
    db.from('payments').select('profile_id').eq('group_id', id).eq('status', 'pendiente').lt('due_date', hoyMx()),
    db.from('certificates').select('profile_id, folio').eq('group_id', id).is('revoked_at', null),
  ])
  const folioDe = new Map((certs || []).map((c) => [c.profile_id, c.folio]))
  const sids = (sesiones || []).map((x) => x.id)
  const { data: asistencias } = sids.length ? await db.from('attendance').select('session_id, profile_id').in('session_id', sids) : { data: [] }
  const pasadas = (sesiones || []).filter((x) => new Date(x.starts_at).getTime() < Date.now()).map((x) => x.id)
  const pctAsistencia = (pid) => (pasadas.length ? Math.round(((asistencias || []).filter((a) => a.profile_id === pid && pasadas.includes(a.session_id)).length / pasadas.length) * 100) : null)
  const pausados = new Set((vencidas || []).map((v) => v.profile_id))
  const personas = (inscr || []).map((e) => ({ ...e.profiles, enrolled_at: e.enrolled_at, acceso: pausados.has(e.profile_id) ? 'pausado' : 'activo' }))
    .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b)))

  return (
    <main className="page">
      <Link href={`/docente/cursos/${g.course_id}`} className="back"><Icon name="chevron" size={16} /> {g.courses?.title}</Link>
      <div className="greeting">
        <div>
          <span className="eyebrow">Grupo</span>
          <h1>{g.name}</h1>
          <p>{g.courses?.title} · {personas.length} estudiante{personas.length === 1 ? '' : 's'}{g.schedule_text ? ` · ${g.schedule_text}` : ''}</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <GroupContent
        groupId={id}
        recursos={recursos}
        sesiones={sesiones}
        alumnos={personas.map((x) => ({ id: x.id, nombre: nombreCompleto(x) }))}
        asistencias={asistencias || []}
        acciones={{ agregarRecurso: agregarRecursoDocente, eliminarRecurso: eliminarRecursoDocente, agregarSesion: agregarSesionDocente, actualizarSesion: actualizarSesionDocente, eliminarSesion: eliminarSesionDocente, marcarAsistencia: marcarAsistenciaDocente }}
      />

      <div className="section-head"><div><span className="eyebrow">Estudiantes</span><h2>Inscritos en este grupo</h2></div></div>
      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '.8fr 2fr 1fr .8fr .8fr 1fr' }}><span>Matrícula</span><span>Nombre</span><span>Inscripción</span><span>Acceso</span><span className="right">Asistencia</span><span>Constancia</span></div>
        {personas.map((p) => {
          const [tono, texto] = ACCESO[p.acceso] || ['neutral', p.acceso]
          return (
            <div key={p.id} className="table-row" style={{ gridTemplateColumns: '.8fr 2fr 1fr .8fr .8fr 1fr', minHeight: 54 }}>
              <span><b style={{ color: 'var(--purple-dark)' }}>{p.matricula}</b></span>
              <span>{nombreCompleto(p)}</span>
              <span>{fechaDia(p.enrolled_at)}</span>
              <span><i className={`status ${tono}`}>{texto}</i></span>
              <span className="right">{pctAsistencia(p.id) === null ? '—' : `${pctAsistencia(p.id)} %`}</span>
              <span>
                {folioDe.get(p.id) ? (
                  <a href={`/api/constancias/${folioDe.get(p.id)}`} className="ghost sm"><Icon name="award" size={15} /> {folioDe.get(p.id)}</a>
                ) : (
                  <form action={emitirConstanciaDocente}>
                    <input type="hidden" name="group_id" value={id} /><input type="hidden" name="profile_id" value={p.id} />
                    <button className="ghost sm" type="submit">Emitir</button>
                  </form>
                )}
              </span>
            </div>
          )
        })}
        {!personas.length && <div className="empty-card" style={{ padding: 20 }}>Todavía no hay inscritos.</div>}
      </section>
    </main>
  )
}
