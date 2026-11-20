import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import Icon from '@/components/Icon'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Enseña en EAC',
  description: 'Publica tus cursos y talleres holísticos en EAC Academia y gana por cada inscripción.',
}

const BENEFICIOS = [
  ['users', 'Una comunidad que ya aprende con nosotros', 'Llega a estudiantes interesados en desarrollo espiritual y terapias alternativas.'],
  ['card', 'Cobros resueltos', 'Tarjeta, SPEI y OXXO en pesos mexicanos. Tú no persigues pagos ni comprobantes.'],
  ['video', 'Aulas listas', 'Clases en vivo con enlace de Meet, lecciones grabadas protegidas y materiales en PDF.'],
  ['chart', 'Ventas transparentes', 'Ve en tiempo real tus inscripciones, ventas y saldo por liquidar.'],
]

const PASOS = [
  ['Crea tu cuenta de docente', 'Cuéntanos sobre tu experiencia y los temas que enseñas.'],
  ['Envía tu propuesta', 'Título, temario, modalidad (en vivo o grabado), precio y materiales.'],
  ['Revisión del equipo EAC', 'Cuidamos la calidad editorial; te damos retroalimentación si hace falta.'],
  ['Publica y cobra', 'Tu curso aparece en el catálogo y recibes tu parte en cada corte.'],
]

const FAQ = [
  ['¿Cuánto gano por cada inscripción?', 'El reparto estándar es 70% para ti y 30% para EAC, calculado sobre el precio de venta menos la comisión de la pasarela de pago. Se puede ajustar según el curso.'],
  ['¿Cuándo recibo mis pagos?', 'Hacemos un corte cada quincena (días 1–15 y 16–fin de mes) y te transferimos tu saldo a la cuenta que registres en tu perfil docente.'],
  ['¿Necesito saber de tecnología?', 'No. Subes tus materiales desde tu portal y nosotros nos encargamos de la plataforma, los cobros y el soporte a estudiantes.'],
  ['¿Puedo dar clases en vivo?', 'Sí. Cada sesión tiene su enlace de Google Meet y después puedes adjuntar la grabación a la misma lección.'],
]

export default function Docentes() {
  return (
    <>
      <PublicHeader active="docente" />
      <main className="pub-main">
        <section className="hero">
          <div>
            <span className="eyebrow">Enseña en EAC Academia</span>
            <h1>Comparte lo que sabes y gana con tus cursos.</h1>
            <p className="lead">
              Publica tus talleres y cursos de artes holísticas en una plataforma profesional. Tú enseñas; nosotros nos
              encargamos de los pagos, las aulas virtuales y la atención a estudiantes.
            </p>
            <div className="ctas">
              <Link href="/docentes/solicitud" className="primary"><Icon name="plus" size={18} /> Crear cuenta de docente</Link>
              <Link href="/entrar?siguiente=/docente" className="secondary">Iniciar sesión</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="moon" />
            <span className="star">✦</span>
            <small>REPARTO ESTÁNDAR</small>
            <b>70% para ti · 30% para EAC</b>
          </div>
        </section>

        <div className="section-head"><div><span className="eyebrow">Beneficios</span><h2>Por qué enseñar con nosotros</h2></div></div>
        <div className="steps-row">
          {BENEFICIOS.map(([icon, t, d]) => (
            <div key={t} className="card step"><span className="stat-icon" style={{ marginBottom: 12 }}><Icon name={icon} /></span><b>{t}</b><span>{d}</span></div>
          ))}
        </div>

        <div className="section-head"><div><span className="eyebrow">Cómo funciona</span><h2>De tu propuesta al catálogo</h2></div></div>
        <div className="steps-row">
          {PASOS.map(([t, d], i) => (
            <div key={t} className="card step"><span className="n">{i + 1}</span><b>{t}</b><span>{d}</span></div>
          ))}
        </div>

        <div className="section-head"><div><span className="eyebrow">Preguntas frecuentes</span><h2>Lo que suelen preguntarnos</h2></div></div>
        <div className="card faq" style={{ padding: '6px 22px' }}>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q} <Icon name="chevron" size={16} /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>

        <section className="cta-band">
          <div>
            <h2>¿Listo para publicar tu primer curso?</h2>
            <p>Crea tu cuenta y envía tu propuesta. Te respondemos en pocos días.</p>
          </div>
          <Link href="/docentes/solicitud" className="primary">Crear cuenta de docente</Link>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
