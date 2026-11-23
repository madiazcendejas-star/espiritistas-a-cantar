import Link from 'next/link'
import Icon from './Icon'
import { money, RECURRENCIA } from '@/lib/format'
import { artFor, NIVEL, modalidadTexto } from '@/lib/catalog'

// Precio de la tarjeta: colegiatura por periodo, parcialidades o pago único.
function precio(course) {
  const g = course.groups.find((x) => Number(x.price_total) === course.precioDesde) || {}
  const desde = course.groups.length > 1 ? 'Desde ' : ''
  if (!course.precioDesde) return { linea: 'Consulta el precio' }
  if (g.recurrence) return { desde, monto: money(course.precioDesde), sufijo: `MXN / ${RECURRENCIA[g.recurrence]}` }
  if (g.installments > 1) return { desde, monto: money(course.precioDesde), sufijo: 'MXN', nota: `o ${g.installments} pagos de ${money(course.precioDesde / g.installments)}` }
  return { desde, monto: money(course.precioDesde), sufijo: 'MXN' }
}

export default function CourseCard({ course }) {
  const p = precio(course)
  const modalidad = modalidadTexto(course.modalidades)
  const detalles = [
    course.modules_count ? `${course.modules_count} módulos` : course.duration_text,
    course.manual_pdf_url ? 'Manual PDF incluido' : null,
    'Acceso de por vida',
  ].filter(Boolean)

  return (
    <Link href={`/cursos/${course.id}`} className="course-card">
      <div className={`cover ${artFor(course.id)}`}>
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt="" loading="lazy" />
        ) : (
          <>
            <div className="orbit" />
            <span>✦</span>
          </>
        )}
        {course.is_upcoming && <span className="cover-badge">Próximamente</span>}
      </div>
      <div className="body">
        <div className="chips">
          {course.level && <span className="chip purple">Nivel: {NIVEL[course.level]}</span>}
          {modalidad && <span className="chip">{modalidad}</span>}
        </div>
        <h3>{course.title}</h3>
        {course.description && <p className="desc">{course.description}</p>}
        <ul className="detalles">
          {detalles.map((d) => <li key={d}><Icon name="check" size={13} /> {d}</li>)}
        </ul>
        <div className="foot">
          <span className="price">
            {p.linea ? <span style={{ fontSize: 15 }}>{p.linea}</span> : (
              <>
                {p.desde && <small className="desde">{p.desde}</small>}
                {p.monto}<small>{p.sufijo}</small>
                {p.nota && <small className="nota">{p.nota}</small>}
              </>
            )}
          </span>
          <span className="text-link">Ver temario →</span>
        </div>
      </div>
    </Link>
  )
}
