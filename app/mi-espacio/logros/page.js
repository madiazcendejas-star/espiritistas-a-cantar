import Link from 'next/link'
import Icon from '@/components/Icon'
import Sello from '@/components/Sello'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sellosDe } from '@/lib/constancias'
import { fechaDia } from '@/lib/format'

export const metadata = { title: 'Mis logros' }

export default async function Logros() {
  const { profile } = await getSessionProfile()
  const db = createAdminClient()
  const [{ data: constancias }, sellos] = await Promise.all([
    db.from('certificates').select('folio, course_title, group_name, issued_on, group_id').eq('profile_id', profile.id).is('revoked_at', null).order('issued_on', { ascending: false }),
    sellosDe(db, profile.id),
  ])

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Tu camino</span>
          <h1>Mis logros</h1>
          <p>Tus constancias y los sellos que ganas al completar una ruta de cursos.</p>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Constancias</span><h2>Cursos concluidos</h2></div></div>
      {constancias?.length ? (
        <div className="stack">
          {constancias.map((c) => (
            <section key={c.folio} className="card constancia-card">
              <div className="stat-icon"><Icon name="award" /></div>
              <div>
                <b>{c.course_title}</b>
                <span>{c.group_name ? `${c.group_name} · ` : ''}{fechaDia(c.issued_on)} · Folio {c.folio}</span>
              </div>
              <a href={`/api/constancias/${c.folio}`} className="primary"><Icon name="file" size={18} /> Descargar</a>
            </section>
          ))}
        </div>
      ) : (
        <div className="card empty-card" style={{ padding: 24 }}>
          <Icon name="award" size={26} />
          <b>Aún no tienes constancias</b>
          Marca como vistas las clases grabadas de tu curso; al completarlas, tu constancia se genera sola.
          <Link href="/mi-espacio/cursos" className="secondary sm" style={{ marginTop: 10 }}>Ir a mis cursos</Link>
        </div>
      )}

      {sellos.length > 0 && (
        <>
          <div className="section-head"><div><span className="eyebrow">Sellos de sabiduría</span><h2>Rutas de aprendizaje</h2></div></div>
          <div className="sellos">
            {sellos.map((s) => (
              <section key={s.id} className={`card sello-card ${s.ganado ? 'ganado' : ''}`}>
                <Sello color={s.color} titulo={s.title} ganado={s.ganado} />
                <div>
                  <b>{s.title}</b>
                  <span className="muted" style={{ fontSize: 13 }}>{s.ganado ? `Ganado el ${fechaDia(s.fecha)}` : `${s.hechos} de ${s.total} cursos`}</span>
                  {s.description && <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>{s.description}</p>}
                  <ul className="sello-cursos">
                    {s.cursos.map((c) => (
                      <li key={c.id} className={c.hecho ? 'hecho' : ''}><Icon name={c.hecho ? 'check' : 'book'} size={14} /> {c.hecho ? c.title : <Link href={`/cursos/${c.id}`}>{c.title}</Link>}</li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
