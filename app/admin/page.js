import Link from 'next/link'
import Icon from '@/components/Icon'
import { requireAdmin } from '@/lib/admin'
import { hoyMx, money, fechaLarga } from '@/lib/format'

export const metadata = { title: 'Panel general' }

const Stat = ({ icon, label, value, trend, tono }) => (
  <article className="stat">
    <div className="stat-icon" style={tono === 'rose' ? { background: 'var(--rose-soft)', color: 'var(--rose)' } : undefined}><Icon name={icon} /></div>
    <div><span>{label}</span><strong>{value}</strong><small style={{ color: 'var(--muted)' }}>{trend}</small></div>
  </article>
)

const Task = ({ href, icon, tone, title, desc, amount }) => (
  <Link href={href} className="task">
    <span className={`task-icon ${tone}`}><Icon name={icon} /></span>
    <span><b>{title}</b><small>{desc}</small></span>
    <strong>{amount}</strong>
    <Icon name="chevron" size={17} />
  </Link>
)

export default async function PanelGeneral() {
  const { db, profile } = await requireAdmin()
  const hoy = hoyMx()
  const en7 = new Date(Date.now() + 7 * 864e5).toISOString()
  const [estudiantes, activos, vencidas, revision, sesiones, pendientes, sinCorreo] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    db.from('enrollments').select('profile_id').eq('status', 'activa'),
    db.from('payments').select('id, amount', { count: 'exact' }).eq('status', 'pendiente').lt('due_date', hoy),
    db.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'en_revision'),
    db.from('live_sessions').select('id, meet_url', { count: 'exact' }).gte('starts_at', new Date().toISOString()).lte('starts_at', en7),
    db.from('payments').select('amount').eq('status', 'pendiente'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').is('email', null),
  ])
  const conAcceso = new Set((activos.data || []).map((e) => e.profile_id)).size
  const montoVencido = (vencidas.data || []).reduce((a, p) => a + Number(p.amount || 0), 0)
  const porCobrar = (pendientes.data || []).reduce((a, p) => a + Number(p.amount || 0), 0)
  const sinMeet = (sesiones.data || []).filter((s) => !s.meet_url).length

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Administración EAC</span>
          <h1>Panel general</h1>
          <p>Visión operativa de la academia al {fechaLarga(new Date())}.</p>
        </div>
        <Link href="/admin/estudiantes/nuevo" className="primary"><Icon name="plus" size={18} /> Nuevo estudiante</Link>
      </div>

      <div className="stats">
        <Stat icon="users" label="Estudiantes" value={estudiantes.count ?? 0} trend={`${conAcceso} con acceso activo`} />
        <Stat icon="clock" label="Cuotas vencidas" value={vencidas.count ?? 0} trend={`${money(montoVencido)} MXN`} tono={vencidas.count ? 'rose' : undefined} />
        <Stat icon="wallet" label="Por cobrar" value={money(porCobrar)} trend={`${(pendientes.data || []).length} cuotas pendientes`} />
        <Stat icon="video" label="Sesiones esta semana" value={sesiones.count ?? 0} trend={sinMeet ? `${sinMeet} sin enlace de Meet` : 'Todas con enlace'} />
      </div>

      <div className="two-col admin-cols">
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Operación</span><h2>Atención requerida</h2></div></div>
          <div className="task-list">
            <Task href="/admin/pagos?filtro=vencidas" icon="clock" tone="purple" title="Cuotas vencidas" desc="Accesos pausados hasta registrar el pago" amount={vencidas.count ?? 0} />
            <Task href="/admin/pagos?filtro=revision" icon="wallet" tone="gold" title="Pagos en revisión" desc="Comprobantes o transferencias por validar" amount={revision.count ?? 0} />
            <Task href="/admin/cursos" icon="video" tone="blue" title="Sesiones próximas" desc={sinMeet ? 'Hay sesiones sin enlace de Meet' : 'Esta semana'} amount={sesiones.count ?? 0} />
            <Task href="/admin/estudiantes?filtro=sin-correo" icon="mail" tone="green" title="Estudiantes sin correo" desc="Necesario para la etapa final de acceso" amount={sinCorreo.count ?? 0} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><span className="eyebrow">Accesos rápidos</span><h2>¿Qué necesitas hacer?</h2></div></div>
          <div className="stack" style={{ marginTop: 16 }}>
            <Link href="/admin/estudiantes" className="secondary full"><Icon name="users" size={18} /> Buscar estudiante</Link>
            <Link href="/admin/pagos" className="secondary full"><Icon name="wallet" size={18} /> Registrar un pago</Link>
            <Link href="/admin/cursos" className="secondary full"><Icon name="book" size={18} /> Cursos, grupos y materiales</Link>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>Sesión de {profile.first_name || 'administración'}. Cada cambio queda registrado.</p>
        </section>
      </div>
    </main>
  )
}
