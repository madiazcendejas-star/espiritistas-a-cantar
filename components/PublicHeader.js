import Link from 'next/link'
import Brand from './Brand'
import Icon from './Icon'
import { getSessionProfile, PANEL_POR_ROL } from '@/lib/auth'

// Menú superior único para todos: Estudiante · Docente · Iniciar sesión.
// Administración no aparece aquí (se entra por /admin).
export default async function PublicHeader({ active }) {
  let panel = null
  try {
    const { profile } = await getSessionProfile()
    if (profile) panel = PANEL_POR_ROL[profile.role]
  } catch {
    panel = null
  }
  return (
    <header className="pub-header">
      <div className="inner">
        <Brand />
        <nav className="pub-nav" aria-label="Menú principal">
          <Link href="/cursos" className={`nav-link ${active === 'estudiante' ? 'active' : ''}`}>Estudiante</Link>
          <Link href="/docentes" className={`nav-link ${active === 'docente' ? 'active' : ''}`}>Docente</Link>
          {panel ? (
            <Link href={panel} className="primary sm"><Icon name="home" size={16} /> Mi espacio</Link>
          ) : (
            <Link href="/entrar" className="primary sm"><Icon name="user" size={16} /> Iniciar sesión</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
