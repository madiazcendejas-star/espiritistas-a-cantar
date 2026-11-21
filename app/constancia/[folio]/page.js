import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CourseCard from '@/components/CourseCard'
import Icon from '@/components/Icon'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCatalog } from '@/lib/catalog'
import { firmaConstancia } from '@/lib/constancias'
import { fechaDia } from '@/lib/format'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Verificar constancia', robots: { index: false } }

// Página a la que lleva el QR de cada constancia: confirma que es auténtica
// y aprovecha para invitar a conocer más cursos.
export default async function VerificarConstancia({ params }) {
  const { folio } = await params
  let c = null
  let comunidad = ''
  if (/^EAC-[A-Z0-9]{4,12}$/.test(folio)) {
    try {
      const db = createAdminClient()
      comunidad = (await firmaConstancia(db)).comunidadUrl
      const { data } = await db.from('certificates').select('folio, full_name, matricula, course_id, course_title, group_name, issued_on, revoked_at').eq('folio', folio).maybeSingle()
      c = data
    } catch {}
  }
  const valida = c && !c.revoked_at
  let cursos = []
  try {
    cursos = (await getCatalog()).filter((x) => x.id !== c?.course_id && !x.is_upcoming).slice(0, 3)
  } catch {}

  return (
    <>
      <PublicHeader />
      <main className="pub-main verifica">
        <section className={`verifica-card ${valida ? 'ok' : 'mal'}`}>
          <div className="verifica-sello">
            {valida ? <Icon name="check" size={30} /> : <Icon name="info" size={30} />}
          </div>
          <span className="verifica-etiqueta">{valida ? 'Certificado válido y vigente' : c?.revoked_at ? 'Constancia cancelada' : 'Folio no encontrado'}</span>
          {valida ? (
            <>
              <h1>{c.full_name}</h1>
              <p className="verifica-sub">concluyó satisfactoriamente el curso</p>
              <h2>{c.course_title}</h2>
              <dl className="verifica-datos">
                <div><dt>Folio</dt><dd>{c.folio}</dd></div>
                <div><dt>Matrícula</dt><dd>{c.matricula || '—'}</dd></div>
                <div><dt>Fecha</dt><dd>{fechaDia(c.issued_on)}</dd></div>
                {c.group_name && <div><dt>Grupo</dt><dd>{c.group_name}</dd></div>}
              </dl>
              <p className="verifica-nota"><Icon name="shield" size={15} /> Emitida y registrada por EAC Academia. Esta constancia es auténtica y no ha sido cancelada.</p>
              <div className="verifica-cta">
                <a href={comunidad || '/cursos'} className="verifica-boton" {...(comunidad ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  <Icon name="users" size={18} /> Únete a EAC
                </a>
                <span>Cursos y talleres de espiritualidad, sanación y artes holísticas, en vivo y a tu ritmo.</span>
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 26 }}>{c?.revoked_at ? 'Este folio fue cancelado' : 'No encontramos esta constancia'}</h1>
              <p className="verifica-sub">{c?.revoked_at ? 'EAC Academia canceló esta constancia, por lo que ya no es válida.' : `Revisa que el folio esté bien escrito (${folio}). Si tienes dudas, escríbenos.`}</p>
            </>
          )}
        </section>

        <section className="verifica-invita">
          <span className="eyebrow">Tu camino sigue</span>
          <h2>Descubre más cursos y talleres</h2>
          <p className="muted">Espiritualidad, sanación y artes holísticas, en vivo y a tu ritmo.</p>
          {cursos.length > 0 && <div className="course-grid" style={{ marginTop: 18 }}>{cursos.map((x) => <CourseCard key={x.id} course={x} />)}</div>}
          <Link href="/cursos" className="primary" style={{ marginTop: 20 }}>Ver todo el catálogo <Icon name="chevron" size={16} /></Link>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
