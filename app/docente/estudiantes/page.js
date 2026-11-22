import Link from 'next/link'
import { requireTeacher, gruposDelDocente } from '@/lib/docente'
import { nombreCompleto } from '@/lib/admin'
import { fechaDia, hoyMx } from '@/lib/format'
import { limitePausa } from '@/lib/ajustes'

export const metadata = { title: 'Estudiantes' }

export default async function EstudiantesDocente({ searchParams }) {
  const { grupo } = await searchParams
  const { profile, db } = await requireTeacher()
  const grupos = await gruposDelDocente(db, profile.id)
  const ids = grupos.map((g) => g.id)
  const filtro = ids.includes(Number(grupo)) ? [Number(grupo)] : ids
  const limite = await limitePausa(db, hoyMx())

  const [{ data: inscr }, { data: vencidas }] = filtro.length
    ? await Promise.all([
        db.from('enrollments').select('profile_id, group_id, enrolled_at, profiles(id, matricula, first_name, last_name)').in('group_id', filtro).eq('status', 'activa').order('enrolled_at', { ascending: false }),
        db.from('payments').select('profile_id, group_id').in('group_id', filtro).eq('status', 'pendiente').lt('due_date', limite),
      ])
    : [{ data: [] }, { data: [] }]
  const pausado = new Set((vencidas || []).map((v) => `${v.profile_id}:${v.group_id}`))
  const grupoDe = (gid) => grupos.find((g) => g.id === gid)

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Portal docente</span>
          <h1>Estudiantes</h1>
          <p>Quiénes están inscritos en tus grupos y si su acceso está activo.</p>
        </div>
      </div>

      {grupos.length > 1 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          <Link href="/docente/estudiantes" className={`chip ${!grupo ? 'purple' : ''}`}>Todos</Link>
          {grupos.map((g) => <Link key={g.id} href={`/docente/estudiantes?grupo=${g.id}`} className={`chip ${Number(grupo) === g.id ? 'purple' : ''}`}>{g.curso} · {g.name}</Link>)}
        </div>
      )}

      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '.8fr 1.6fr 1.8fr 1fr .8fr' }}><span>Matrícula</span><span>Nombre</span><span>Curso y grupo</span><span>Inscripción</span><span>Acceso</span></div>
        {(inscr || []).map((e) => {
          const p = e.profiles || {}
          const g = grupoDe(e.group_id)
          const pa = pausado.has(`${e.profile_id}:${e.group_id}`)
          return (
            <div key={`${e.profile_id}-${e.group_id}`} className="table-row" style={{ gridTemplateColumns: '.8fr 1.6fr 1.8fr 1fr .8fr', minHeight: 54 }}>
              <span><b style={{ color: 'var(--purple-dark)' }}>{p.matricula}</b></span>
              <span>{nombreCompleto(p)}</span>
              <span><Link href={`/docente/grupos/${e.group_id}`} style={{ color: 'var(--purple)', fontWeight: 600 }}>{g?.curso} · {g?.name}</Link></span>
              <span>{fechaDia(e.enrolled_at)}</span>
              <span><i className={`status ${pa ? 'danger' : 'success'}`}>{pa ? 'Pausado' : 'Activo'}</i></span>
            </div>
          )
        })}
        {!inscr?.length && <div className="empty-card" style={{ padding: 22 }}>{grupos.length ? 'Todavía no hay estudiantes inscritos.' : 'Cuando tengas grupos, aquí verás a tus estudiantes.'}</div>}
      </section>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>«Pausado» significa que tiene una cuota vencida; su acceso vuelve en cuanto paga. Los datos de contacto los administra EAC.</p>
    </main>
  )
}
