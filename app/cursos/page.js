import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CourseCard from '@/components/CourseCard'
import Icon from '@/components/Icon'
import { getCatalog } from '@/lib/catalog'

export const revalidate = 300
export const metadata = { title: 'Cursos' }

export default async function Cursos() {
  let cursos = []
  let error = false
  try {
    cursos = await getCatalog()
  } catch {
    error = true
  }
  return (
    <>
      <PublicHeader active="estudiante" />
      <main className="pub-main" style={{ paddingTop: 36 }}>
        <div className="greeting">
          <div>
            <span className="eyebrow">Catálogo</span>
            <h1>Cursos y talleres</h1>
            <p>Elige tu curso y la fecha o modalidad que mejor te acomode.</p>
          </div>
          <a href="/entrar" className="secondary"><Icon name="user" size={16} /> Iniciar sesión</a>
        </div>
        {error ? (
          <div className="notice danger"><Icon name="info" /><span>No pudimos cargar el catálogo. Intenta de nuevo en unos minutos.</span></div>
        ) : cursos.length ? (
          <div className="catalog-grid">{cursos.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        ) : (
          <div className="card empty-card"><Icon name="book" size={28} /><b>Aún no hay cursos publicados</b>Vuelve pronto.</div>
        )}
      </main>
      <PublicFooter />
    </>
  )
}
