import Brand from './Brand'
import Icon from './Icon'
import NavLinks from './NavLinks'
import { cerrarSesion } from '@/app/entrar/actions'
import { iniciales } from '@/lib/auth'

const NAV = [
  { href: '/admin', label: 'Panel general', icon: 'home', exact: true },
  { href: '/admin/estudiantes', label: 'Estudiantes y accesos', icon: 'users' },
  { href: '/admin/pagos', label: 'Pagos', icon: 'wallet' },
  { href: '/admin/cursos', label: 'Cursos y grupos', icon: 'book' },
]

export default function AdminShell({ profile, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand href="/admin" />
        <div className="nav-label">ADMINISTRACIÓN</div>
        <NavLinks items={NAV} />
        <div className="side-bottom">
          <div className="help-card">
            <Icon name="shield" size={24} />
            <b>Panel de administración</b>
            <span>Cada cambio queda registrado con tu nombre y la fecha.</span>
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="mobile-brand"><Brand href="/admin" /></div>
          <span className="title-sm desktop-only">Administración EAC</span>
          <div className="header-actions">
            <span className="profile-button" style={{ cursor: 'default' }}>
              <span className="avatar">{iniciales(profile)}</span>
              <div><b>{profile.first_name || 'Administración'}</b><small>Administración</small></div>
            </span>
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
