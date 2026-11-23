import Icon from '@/components/Icon'
import LiveSessionCard from '@/components/LiveSessionCard'
import { getSessionProfile } from '@/lib/auth'
import { getMisGrupos, getProximasSesiones, getSesionesPasadas } from '@/lib/student'

export const metadata = { title: 'Sesiones en vivo' }

export default async function Vivo() {
  const { supabase } = await getSessionProfile()
  const grupos = await getMisGrupos(supabase)
  const ids = grupos.filter((g) => g.access_state === 'activo').map((g) => g.group_id)
  const [proximas, pasadas] = await Promise.all([getProximasSesiones(supabase, 30, ids), getSesionesPasadas(supabase, 20, ids)])
  const de = (gid) => grupos.find((g) => g.group_id === gid)
  const ahora = Date.now()
  const pausados = grupos.filter((g) => g.access_state === 'pausado')

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Clases y talleres en vivo</span>
          <h1>Sesiones en vivo</h1>
          <p>El botón para unirte se habilita automáticamente 15 minutos antes de cada sesión.</p>
        </div>
      </div>
      {pausados.length > 0 && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          <Icon name="info" />
          <span>Las sesiones de {pausados.map((g) => g.curso.title).join(', ')} no aparecen porque el acceso está pausado por una cuota pendiente.</span>
        </div>
      )}
      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Próximas</span><h2>Agenda de sesiones</h2></div></div>
      {proximas.length ? (
        proximas.map((s) => <LiveSessionCard key={s.id} session={s} courseTitle={de(s.group_id)?.curso.title || ''} groupName={de(s.group_id)?.grupo.name || ''} ahoraServidor={ahora} />)
      ) : (
        <div className="card empty-card" style={{ padding: 24 }}>No hay sesiones programadas por ahora.</div>
      )}
      {pasadas.length > 0 && (
        <>
          <div className="section-head"><div><span className="eyebrow">Anteriores</span><h2>Sesiones pasadas</h2></div></div>
          {pasadas.map((s) => <LiveSessionCard key={s.id} session={s} courseTitle={de(s.group_id)?.curso.title || ''} groupName={de(s.group_id)?.grupo.name || ''} ahoraServidor={ahora} />)}
        </>
      )}
    </main>
  )
}
