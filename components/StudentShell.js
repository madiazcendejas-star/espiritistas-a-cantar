import Link from 'next/link'
import Brand from './Brand'
import Icon from './Icon'
import NavLinks from './NavLinks'
import { cerrarSesion } from '@/app/entrar/actions'
import { iniciales } from '@/lib/auth'

const NAV = [
  { href: '/mi-espacio', label: 'Mi espacio', icon: 'home', exact: true },
  { href: '/mi-espacio/cursos', label: 'Mis cursos', icon: 'book' },
  { href: '/mi-espacio/vivo', label: 'En vivo', icon: 'video' },
  { href: '/mi-espacio/pagos', label: 'Mis pagos', icon: 'wallet' },
  { href: '/mi-espacio/logros', label: 'Logros', icon: 'award' },
  { href: '/mi-espacio/perfil', label: 'Mi perfil', icon: 'user' },
]

// Estructura del prototipo: menú lateral en computadora, barra inferior en celular.
export default function StudentShell({ profile, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand href="/mi-espacio" />
        <div className="nav-label">MENÚ PRINCIPAL</div>
        <NavLinks items={NAV} />
        <div className="side-bottom">
          <div className="help-card">
            <Icon name="spark" size={24} />
            <b>¿Necesitas ayuda?</b>
            <span>Estamos para acompañarte en cada paso.</span>
            <Link href="/mi-espacio/perfil#ayuda">Centro de ayuda</Link>
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="mobile-brand"><Brand href="/mi-espacio" /></div>
          <span className="title-sm desktop-only">Mi espacio de aprendizaje</span>
          <div className="header-actions">
            <Link href="/mi-espacio/perfil" className="profile-button">
              <span className="avatar">{iniciales(profile)}</span>
              <div>
                <b>{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Estudiante'}</b>
                <small>Matrícula {profile.matricula}</small>
              </div>
            </Link>
            <form action={cerrarSesion}>
              <button className="icon-button" type="submit" aria-label="Cerrar sesión" title="Cerrar sesión"><Icon name="logout" size={18} /></button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
