import Link from 'next/link'
import Icon from '@/components/Icon'
import LiveSessionCard from '@/components/LiveSessionCard'
import MiniGrupo from '@/components/MiniGrupo'
import AgregarCorreo from '@/components/AgregarCorreo'
import { esCorreoTecnico } from '@/lib/cuentas'
import { getSessionProfile, nombreCorto } from '@/lib/auth'
import { getMisGrupos, getProximasSesiones, getPagos } from '@/lib/student'
import { fechaLarga, fechaDia, money, MODALIDAD } from '@/lib/format'

export const metadata = { title: 'Mi espacio' }

function saludo() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City', hour: 'numeric', hour12: false }))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default async function MiEspacio() {
  const { supabase, profile, user } = await getSessionProfile()
  const sinCorreo = esCorreoTecnico(profile.email)
  const [grupos, sesiones, pagos] = await Promise.all([getMisGrupos(supabase), getProximasSesiones(supabase, 3), getPagos(supabase)])
  const principal = grupos.find((g) => g.access_state === 'activo') || grupos[0]
  const pausados = grupos.filter((g) => g.access_state === 'pausado')
  const vencidos = pagos.filter((p) => p.vencido)
  const proximaCuota = pagos.find((p) => p.status === 'pendiente' && !p.vencido)
  const proxima = sesiones[0]
  const grupoDe = (gid) => grupos.find((g) => g.group_id === gid)
  const nombre = nombreCorto(profile)

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Mi espacio de aprendizaje</span>
          <h1>{saludo()}{nombre ? `, ${nombre}` : ''}</h1>
          <p>Continúa tu camino de aprendizaje y transformación.</p>
        </div>
        <div className="date-pill"><Icon name="calendar" /><span><small>HOY</small>{fechaLarga(new Date())}</span></div>
      </div>

      {sinCorreo && <AgregarCorreo pendiente={user?.user_metadata?.correo_pendiente || null} />}

      {(vencidos.length > 0 || pausados.length > 0) && (
        <div className="notice danger" style={{ marginBottom: 20 }}>
          <Icon name="lock" />
          <span>
            <b>Tienes {vencidos.length === 1 ? 'una cuota vencida' : `${vencidos.length} cuotas vencidas`}.</b>{' '}
            El acceso a {pausados.length === 1 ? 'un grupo está pausado' : 'algunos grupos está pausado'} hasta que se registre el pago.{' '}
            <Link href="/mi-espacio/pagos" style={{ fontWeight: 700, textDecoration: 'underline' }}>Ver mis pagos</Link>
          </span>
        </div>
      )}

      {principal ? (
        <section className="continue-card">
          <div className={`course-art ${principal.curso.id % 2 ? '' : 'blue'}`}>
            <div className="moon" />
            <span className="star">✦</span>
            <small>{(MODALIDAD[principal.grupo.modality] || 'CURSO').toUpperCase()} · CONTINÚA DONDE TE QUEDASTE</small>
            <b>{principal.grupo.name}</b>
          </div>
          <div className="course-info">
            <span className="tag">{principal.access_state === 'activo' ? 'Acceso activo' : 'Acceso pausado'}</span>
            <h2>{principal.curso.title}</h2>
            <p>{principal.grupo.name}{principal.grupo.schedule_text ? ` · ${principal.grupo.schedule_text}` : ''}</p>
            <div style={{ marginTop: 24 }}>
              <Link href={`/mi-espacio/grupo/${principal.group_id}`} className="primary"><Icon name="play" size={18} /> Entrar al curso</Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="card empty-card">
          <Icon name="book" size={28} />
          <b>Aún no tienes cursos activos</b>
          Explora el catálogo para inscribirte a tu primer curso.
          <div style={{ marginTop: 16 }}><Link href="/cursos" className="primary">Ver cursos</Link></div>
        </div>
      )}

      <div className="section-head">
        <div><span className="eyebrow">Próximamente</span><h2>Tu próxima sesión en vivo</h2></div>
        <Link href="/mi-espacio/vivo" className="text-link">Ver todas <Icon name="chevron" size={16} /></Link>
      </div>
      {proxima ? (
        <LiveSessionCard
          session={proxima}
          courseTitle={grupoDe(proxima.group_id)?.curso.title || ''}
          groupName={grupoDe(proxima.group_id)?.grupo.name || ''}
          ahoraServidor={Date.now()}
        />
      ) : (
        <div className="card empty-card" style={{ padding: 24 }}>No tienes sesiones en vivo programadas.</div>
      )}

      {proximaCuota && (
        <>
          <div className="section-head"><div><span className="eyebrow">Pagos</span><h2>Tu próxima cuota</h2></div></div>
          <div className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <b style={{ fontSize: 22, fontWeight: 700 }}>{money(proximaCuota.amount)} <small className="muted" style={{ fontSize: 12 }}>MXN</small></b>
              <div className="muted" style={{ fontSize: 13 }}>Vence el {fechaDia(proximaCuota.due_date)} · {grupoDe(proximaCuota.group_id)?.curso.title || 'Curso'}</div>
            </div>
            <Link href="/mi-espacio/pagos" className="secondary">Ver mis pagos</Link>
          </div>
        </>
      )}

      {grupos.length > 1 && (
        <>
          <div className="section-head">
            <div><span className="eyebrow">Tu biblioteca</span><h2>Mis cursos</h2></div>
            <Link href="/mi-espacio/cursos" className="text-link">Ver todos <Icon name="chevron" size={16} /></Link>
          </div>
          <div className="course-grid">
            {grupos.slice(0, 3).map((g) => <MiniGrupo key={g.group_id} g={g} />)}
          </div>
        </>
      )}
    </main>
  )
}
