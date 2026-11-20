import Link from 'next/link'
import { artFor } from '@/lib/catalog'

export default function MiniGrupo({ g }) {
  return (
    <Link href={`/mi-espacio/grupo/${g.group_id}`} className="mini-course">
      <div className={`mini-art ${artFor(g.curso.id)}`}><div className="orbit" /><span>✦</span></div>
      <div className="mini-body">
        <span className={`mini-label ${g.access_state === 'activo' ? 'done' : ''}`}>{g.access_state === 'activo' ? 'Acceso activo' : 'Acceso pausado'}</span>
        <h3>{g.curso.title}</h3>
        <div className="mini-meta"><span>{g.grupo.name}</span></div>
      </div>
    </Link>
  )
}
