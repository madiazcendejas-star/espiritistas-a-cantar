import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CourseCard from '@/components/CourseCard'
import ProductCard from '@/components/ProductCard'
import Icon from '@/components/Icon'
import { getCatalog, getPopulares, CATEGORIAS } from '@/lib/catalog'
import { getTienda } from '@/lib/tienda'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'EAC Academia · Tu academia de desarrollo espiritual en línea',
  description: 'Academia de artes espirituales en línea: espiritismo, tarot, oráculos, numerología, mancias, desarrollo espiritual y personal. Clases en vivo y grabadas.',
}

const intento = async (fn, porDefecto) => {
  try {
    return await fn()
  } catch {
    return porDefecto
  }
}

export default async function Home() {
  const [catalogo, populares, materiales] = await Promise.all([
    intento(() => getCatalog(), []),
    intento(() => getPopulares(3), []),
    intento(async () => (await getTienda()).slice(0, 4), []),
  ])
  const cuantos = (slug) => catalogo.filter((c) => (c.categories || []).includes(slug)).length

  return (
    <>
      <PublicHeader />
      <main className="pub-main">
        {/* Portada */}
        <section className="hero hero-v2">
          <div>
            <span className="eyebrow">EAC Academia</span>
            <h1>EAC, tu academia de desarrollo espiritual <span className="acento">en línea</span>.</h1>
            <p className="lead">
              Somos una academia de artes espirituales en línea que te impulsará a descubrir tu potencial interior y llevar tu
              desarrollo personal y espiritual al siguiente nivel.
            </p>
            <div className="ctas">
              <Link href="/cursos" className="primary"><Icon name="book" size={18} /> Ver cursos</Link>
              <Link href="/entrar" className="secondary">Ya tengo cuenta</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="moon" />
            <span className="star">✦</span>
            <div className="hero-orbita">
              {CATEGORIAS.slice(0, 6).map((c) => <span key={c.slug}>{c.simbolo} {c.nombre}</span>)}
            </div>
            <small>CLASES EN VIVO · GRABACIONES · MATERIALES</small>
            <b>Aprende a tu ritmo, acompañado por una comunidad.</b>
          </div>
        </section>

        {/* Categorías */}
        <section className="home-bloque">
          <div className="section-head" style={{ marginTop: 0 }}>
            <div><span className="eyebrow">Explora por tema</span><h2>¿Qué te gustaría aprender?</h2></div>
          </div>
          <div className="categorias">
            {CATEGORIAS.map((c) => {
              const n = cuantos(c.slug)
              return (
                <Link key={c.slug} href={`/cursos?categoria=${c.slug}`} className="categoria">
                  <span className="cat-simbolo">{c.simbolo}</span>
                  <b>{c.nombre}</b>
                  <small>{n ? `${n} curso${n === 1 ? '' : 's'}` : 'Próximamente'}</small>
                </Link>
              )
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <Link href="/cursos" className="primary"><Icon name="book" size={18} /> Ver cursos</Link>
          </div>
        </section>

        {/* Para cada etapa */}
        <section className="para-ti">
          <div className="para-ti-texto">
            <span className="eyebrow">Un lugar para ti</span>
            <h2>Para quienes apenas despiertan y para quienes buscan profundizar</h2>
            <p>
              En EAC Academia creemos que cada proceso es único. Si es tu primer acercamiento, encontrarás una guía clara,
              aterrizada y libre de juicios; si ya recorres este camino, hallarás herramientas estructuradas para expandir tu
              práctica. Aquí hay un lugar para ti.
            </p>
            <Link href="/cursos" className="primary">Explorar todos los cursos <Icon name="chevron" size={16} /></Link>
          </div>
          <div className="para-ti-tarjetas">
            <div className="etapa">
              <span className="etapa-n">01</span>
              <b>Si es tu primer acercamiento</b>
              <span>Cursos de nivel principiante, paso a paso y con acompañamiento.</span>
            </div>
            <div className="etapa">
              <span className="etapa-n">02</span>
              <b>Si ya recorres este camino</b>
              <span>Formaciones intermedias y avanzadas para expandir tu práctica.</span>
            </div>
          </div>
        </section>

        {/* Más populares */}
        <div className="section-head populares-head">
          <div>
            <span className="eyebrow">Lo más elegido por nuestra comunidad</span>
            <h2>Cursos más populares</h2>
            <p className="muted" style={{ maxWidth: 640, margin: '6px 0 0' }}>
              Las formaciones preferidas por nuestros alumnos para iniciar su camino espiritual o profundizar en su práctica
              holística, con acceso inmediato y material descargable.
            </p>
          </div>
          <Link href="/cursos" className="text-link">Ver todos <Icon name="chevron" size={16} /></Link>
        </div>
        {populares.length ? (
          <div className="catalog-grid">{populares.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        ) : (
          <div className="card empty-card"><Icon name="book" size={28} /><b>Muy pronto publicaremos el catálogo</b>Mientras tanto, si ya eres estudiante, entra a tu espacio.</div>
        )}

        {materiales.length > 0 && (
          <>
            <div className="section-head">
              <div><span className="eyebrow">Tienda</span><h2>Ebooks y materiales</h2></div>
              <Link href="/tienda" className="text-link">Ver la tienda <Icon name="chevron" size={16} /></Link>
            </div>
            <div className="product-grid" style={{ marginBottom: 0 }}>{materiales.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </>
        )}

        <div className="section-head"><div><span className="eyebrow">Cómo funciona</span><h2>Empieza en cuatro pasos</h2></div></div>
        <div className="steps-row">
          {[
            ['Elige tu curso', 'Revisa el temario, la modalidad y las fechas disponibles.'],
            ['Inscríbete', 'Paga con tarjeta u OXXO. Tu cuenta se crea con tu correo.'],
            ['Entra a tu espacio', 'Desde tu celular, con tu teléfono o correo y tu contraseña.'],
            ['Aprende a tu ritmo', 'Clases en vivo, grabaciones y materiales en un solo lugar.'],
          ].map(([t, d], i) => (
            <div key={t} className="card step"><span className="n">{i + 1}</span><b>{t}</b><span>{d}</span></div>
          ))}
        </div>

        <section className="cta-band">
          <div>
            <span className="eyebrow">Para docentes</span>
            <h2>¿Enseñas terapias o artes holísticas?</h2>
            <p>Publica tus cursos en EAC y gana por cada inscripción. Nosotros nos encargamos de los pagos y la plataforma.</p>
          </div>
          <Link href="/docentes" className="primary">Conoce cómo <Icon name="chevron" size={16} /></Link>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
