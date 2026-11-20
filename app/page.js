import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CourseCard from '@/components/CourseCard'
import Icon from '@/components/Icon'
import { getCatalog } from '@/lib/catalog'

export const revalidate = 300

export default async function Home() {
  let destacados = []
  try {
    destacados = (await getCatalog()).slice(0, 3)
  } catch {
    destacados = []
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
          <div className="card"><span className="stat-icon"><Icon name="card" /></span><div><b>Pagos locales</b><span>Tarjeta, transferencia SPEI u OXXO, también en parcialidades.</span></div></div>
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

        <div className="section-head"><div><span className="eyebrow">Cómo funciona</span><h2>Empieza en cuatro pasos</h2></div></div>
        <div className="steps-row">
          {[
            ['Elige tu curso', 'Revisa el temario, la modalidad y las fechas disponibles.'],
            ['Inscríbete', 'Paga con tarjeta, SPEI u OXXO. Tu cuenta se crea con tu correo.'],
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
