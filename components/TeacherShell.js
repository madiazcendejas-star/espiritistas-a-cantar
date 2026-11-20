import Link from 'next/link'
import Brand from './Brand'
import Icon from './Icon'
import NavLinks from './NavLinks'
import { cerrarSesion } from '@/app/entrar/actions'
import { iniciales } from '@/lib/auth'

const NAV = [
  { href: '/docente', label: 'Inicio', icon: 'home', exact: true },
  { href: '/docente/cursos', label: 'Mis cursos', icon: 'book' },
  { href: '/docente/estudiantes', label: 'Estudiantes', icon: 'users' },
  { href: '/docente/ganancias', label: 'Ganancias', icon: 'wallet' },
  { href: '/docente/perfil', label: 'Mi perfil docente', icon: 'user' },
]

export default function TeacherShell({ profile, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand href="/docente" />
        <div className="nav-label">PORTAL DOCENTE</div>
        <NavLinks items={NAV} label="Portal docente" />
        <div className="side-bottom">
          <div className="help-card">
            <Icon name="spark" size={24} />
            <b>¿Dudas sobre tu curso?</b>
            <span>Escríbenos y te acompañamos en la publicación.</span>
            <Link href="/mi-espacio">Ir a mi espacio de estudiante</Link>
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="mobile-brand"><Brand href="/docente" /></div>
          <span className="title-sm desktop-only">Portal docente</span>
          <div className="header-actions">
            <Link href="/docente/perfil" className="profile-button">
              <span className="avatar">{iniciales(profile)}</span>
              <div>
                <b>{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Docente'}</b>
                <small>{profile.role === 'admin' ? 'Administración' : 'Docente'}</small>
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
