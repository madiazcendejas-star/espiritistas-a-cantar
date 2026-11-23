import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CourseCard from '@/components/CourseCard'
import Icon from '@/components/Icon'
import { getCatalog } from '@/lib/catalog'
import { getTienda } from '@/lib/tienda'
import ProductCard from '@/components/ProductCard'

export const dynamic = 'force-dynamic'


export default async function Home() {
  let destacados = []
  let materiales = []
  try {
    destacados = (await getCatalog()).slice(0, 3)
  } catch {
    destacados = []
  }
  try {
    materiales = (await getTienda()).slice(0, 4)
  } catch {
    materiales = []
  }

  return (
    <>
      <PublicHeader />
      <main className="pub-main">
        <section className="hero">
          <div>
            <span className="eyebrow">Escuela de artes holísticas</span>
            <h1>Aprende, practica y transforma tu camino.</h1>
            <p className="lead">
              Cursos y talleres de tarot, sanación energética, cristales, meditación y más. Clases en vivo, lecciones
              grabadas y materiales para descargar, desde tu celular o tu computadora.
            </p>
            <div className="ctas">
              <Link href="/cursos" className="primary"><Icon name="book" size={18} /> Ver cursos</Link>
              <Link href="/entrar" className="secondary">Ya tengo cuenta</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="moon" />
            <span className="star">✦</span>
            <small>RUTAS DE APRENDIZAJE</small>
            <b>Conocimiento con estructura,<br />práctica con sentido.</b>
          </div>
        </section>

        <section className="trust">
          <div className="card"><span className="stat-icon"><Icon name="video" /></span><div><b>Clases en vivo</b><span>Te unes con un clic 15 minutos antes de cada sesión.</span></div></div>
          <div className="card"><span className="stat-icon"><Icon name="file" /></span><div><b>Materiales siempre disponibles</b><span>Grabaciones, guías y manuales en tu espacio personal.</span></div></div>
          <div className="card"><span className="stat-icon"><Icon name="card" /></span><div><b>Pagos locales</b><span>Tarjeta u OXXO, en un pago, a plazos o por colegiatura.</span></div></div>
        </section>

        <div className="section-head">
          <div><span className="eyebrow">Catálogo</span><h2>Cursos destacados</h2></div>
          <Link href="/cursos" className="text-link">Ver todos <Icon name="chevron" size={16} /></Link>
        </div>
        {destacados.length ? (
          <div className="catalog-grid">{destacados.map((c) => <CourseCard key={c.id} course={c} />)}</div>
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
