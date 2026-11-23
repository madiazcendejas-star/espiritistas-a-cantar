import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CourseCard from '@/components/CourseCard'
import Icon from '@/components/Icon'
import Link from 'next/link'
import { getCatalog, CATEGORIAS } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Cursos y talleres', description: 'Cursos de espiritismo, tarot, oráculos, numerología, mancias, desarrollo espiritual y personal en línea.' }

export default async function Cursos({ searchParams }) {
  const { categoria } = await searchParams
  const cat = CATEGORIAS.find((c) => c.slug === categoria)
  let cursos = []
  let error = false
  try {
    cursos = await getCatalog({ categoria: cat?.slug })
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
            <h1>{cat ? cat.nombre : 'Cursos y talleres'}</h1>
            <p>{cat ? `Cursos y talleres de ${cat.nombre.toLowerCase()}.` : 'Elige tu curso y la fecha o modalidad que mejor te acomode.'}</p>
          </div>
          <a href="/entrar" className="secondary"><Icon name="user" size={16} /> Iniciar sesión</a>
        </div>
        <nav className="filtro-categorias" aria-label="Categorías">
          <Link href="/cursos" className={!cat ? 'activa' : ''}>Todos</Link>
          {CATEGORIAS.map((c) => <Link key={c.slug} href={`/cursos?categoria=${c.slug}`} className={cat?.slug === c.slug ? 'activa' : ''}>{c.simbolo} {c.nombre}</Link>)}
        </nav>
        {error ? (
          <div className="notice danger"><Icon name="info" /><span>No pudimos cargar el catálogo. Intenta de nuevo en unos minutos.</span></div>
        ) : cursos.length ? (
          <div className="catalog-grid">{cursos.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        ) : (
          <div className="card empty-card"><Icon name="book" size={28} /><b>{cat ? `Pronto tendremos cursos de ${cat.nombre.toLowerCase()}` : 'Aún no hay cursos publicados'}</b>{cat ? <Link href="/cursos" className="secondary sm" style={{ marginTop: 10 }}>Ver todos los cursos</Link> : 'Vuelve pronto.'}</div>
        )}
      </main>
      <PublicFooter />
    </>
  )
}
