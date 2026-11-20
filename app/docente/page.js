import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import { requireTeacher, cursosDelDocente, gruposDelDocente, ESTADO_CURSO } from '@/lib/docente'
import { nombreCorto } from '@/lib/auth'
import { money2, fechaLarga, hora, hoyMx } from '@/lib/format'

export const metadata = { title: 'Portal docente' }

export default async function DocenteInicio({ searchParams }) {
  const sp = await searchParams
  const { profile, db } = await requireTeacher()
  const [cursos, grupos] = await Promise.all([cursosDelDocente(db, profile.id), gruposDelDocente(db, profile.id)])
  const ids = grupos.map((g) => g.id)
  const mes = hoyMx().slice(0, 7)

  const [{ count: estudiantes }, { data: sesiones }, { data: ganancias }] = await Promise.all([
    ids.length ? db.from('enrollments').select('id', { count: 'exact', head: true }).in('group_id', ids).eq('status', 'activa') : { count: 0 },
    ids.length ? db.from('live_sessions').select('id, group_id, title, number, starts_at, meet_url').in('group_id', ids).gte('starts_at', new Date(Date.now() - 2 * 3600 * 1000).toISOString()).order('starts_at').limit(5) : { data: [] },
    db.from('teacher_earnings').select('gross, teacher_amount, earned_on, payout_id').eq('teacher_id', profile.id),
  ])
  const pendiente = (ganancias || []).filter((g) => !g.payout_id).reduce((a, g) => a + Number(g.teacher_amount), 0)
  const delMes = (ganancias || []).filter((g) => String(g.earned_on).startsWith(mes))
  const ventasMes = delMes.reduce((a, g) => a + Number(g.gross), 0)
  const grupoDe = (gid) => grupos.find((g) => g.id === gid)
  const nombre = nombreCorto(profile)

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Portal docente</span>
          <h1>Hola{nombre ? `, ${nombre}` : ''}</h1>
          <p>Tus cursos, tus grupos y tus ganancias en un solo lugar.</p>
        </div>
        <Link href="/docente/cursos#nuevo" className="primary"><Icon name="plus" size={18} /> Proponer un curso</Link>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <div className="stats">
        <article className="stat"><div className="stat-icon"><Icon name="book" /></div><div><span>Cursos</span><strong>{cursos.length}</strong><small style={{ color: 'var(--muted)' }}>{cursos.filter((c) => c.review_status === 'aprobado').length} publicados</small></div></article>
        <article className="stat"><div className="stat-icon"><Icon name="users" /></div><div><span>Estudiantes activos</span><strong>{estudiantes || 0}</strong><small style={{ color: 'var(--muted)' }}>en {grupos.length} grupo{grupos.length === 1 ? '' : 's'}</small></div></article>
        <article className="stat"><div className="stat-icon"><Icon name="chart" /></div><div><span>Ventas del mes</span><strong>{money2(ventasMes)}</strong><small style={{ color: 'var(--muted)' }}>{delMes.length} pago{delMes.length === 1 ? '' : 's'}</small></div></article>
        <article className="stat"><div className="stat-icon"><Icon name="wallet" /></div><div><span>Por cobrar</span><strong>{money2(pendiente)}</strong><small style={{ color: 'var(--muted)' }}>se paga cada quincena</small></div></article>
      </div>

      {!cursos.length && (
        <section className="card" style={{ padding: 26 }}>
          <span className="eyebrow">Primer paso</span>
          <h2 style={{ fontWeight: 700, fontSize: 22, margin: '6px 0 8px' }}>Propón tu primer curso</h2>
          <p className="muted" style={{ marginTop: 0 }}>Escribe el nombre, la descripción y el temario; agrega un grupo con su fecha y precio, y envíalo a revisión. Te avisaremos por correo en cuanto esté publicado.</p>
          <Link href="/docente/cursos#nuevo" className="primary"><Icon name="plus" size={18} /> Empezar</Link>
        </section>
      )}

      {sesiones?.length > 0 && (
        <>
          <div className="section-head"><div><span className="eyebrow">Agenda</span><h2>Próximas clases en vivo</h2></div></div>
          <section className="table-panel">
            {sesiones.map((s) => (
              <Link key={s.id} href={`/docente/grupos/${s.group_id}`} className="table-row" style={{ gridTemplateColumns: '1.6fr 1.2fr 1fr 38px' }}>
                <span><b>{s.title}</b><small className="muted" style={{ display: 'block' }}>{grupoDe(s.group_id)?.curso} · {grupoDe(s.group_id)?.name}</small></span>
                <span>{fechaLarga(s.starts_at)}, {hora(s.starts_at)}</span>
                <span>{s.meet_url ? <i className="status success">Con Meet</i> : <i className="status review">Falta Meet</i>}</span>
                <Icon name="chevron" size={16} />
              </Link>
            ))}
          </section>
        </>
      )}

      {cursos.length > 0 && (
        <>
          <div className="section-head"><div><span className="eyebrow">Cursos</span><h2>Mis cursos</h2></div><Link href="/docente/cursos" className="ghost">Ver todos</Link></div>
          <section className="table-panel">
            {cursos.slice(0, 6).map((c) => {
              const [tono, texto] = c.propio ? ESTADO_CURSO[c.review_status] || ['neutral', c.review_status] : ['info', 'Grupo asignado']
              return (
                <Link key={c.id} href={`/docente/cursos/${c.id}`} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 38px' }}>
                  <span><b>{c.title}</b></span>
                  <span><i className={`status ${tono}`}>{texto}</i></span>
                  <Icon name="chevron" size={16} />
                </Link>
              )
            })}
          </section>
        </>
      )}
    </main>
  )
}
