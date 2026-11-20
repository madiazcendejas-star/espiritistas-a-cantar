import Link from 'next/link'
import { money, MODALIDAD } from '@/lib/format'
import { artFor } from '@/lib/catalog'

export default function CourseCard({ course }) {
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
      </div>
      <div className="body">
        <div className="chips">
          {course.is_upcoming && <span className="chip gold">Próximamente</span>}
          {course.modalidades.map((m) => (
            <span key={m} className="chip">{MODALIDAD[m] || m}</span>
          ))}
        </div>
        <h3>{course.title}</h3>
        {course.description && <p>{course.description.length > 110 ? course.description.slice(0, 110) + '…' : course.description}</p>}
        <div className="foot">
          {course.precioDesde > 0 ? (
            <span className="price">
              {course.groups.length > 1 && <small style={{ marginLeft: 0, marginRight: 4 }}>desde</small>}
              {money(course.precioDesde)}
              <small>MXN</small>
            </span>
          ) : (
            <span className="price" style={{ fontSize: 16 }}>Consulta precio</span>
          )}
          <span className="text-link">Ver curso →</span>
        </div>
      </div>
    </Link>
  )
}
