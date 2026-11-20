import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import LiveSessionCard from '@/components/LiveSessionCard'
import { getSessionProfile } from '@/lib/auth'
import { getPagos } from '@/lib/student'
import { getGrupoConMaterial } from '@/lib/groupContent'
import { money, fechaDia, MODALIDAD } from '@/lib/format'

export const metadata = { title: 'Curso' }

export default async function Grupo({ params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  const { supabase } = await getSessionProfile()
  const data = await getGrupoConMaterial(supabase, id)
  if (!data) notFound()
  const { grupo, curso, pausado, items, sesiones } = data

  const vencidas = pausado ? (await getPagos(supabase)).filter((p) => p.vencido && String(p.group_id) === String(id)) : []
  const ahora = Date.now()
  const proximas = sesiones.filter((s) => new Date(s.starts_at).getTime() > ahora - 90 * 60000)
  const pasadas = sesiones.filter((s) => new Date(s.starts_at).getTime() <= ahora - 90 * 60000).reverse()
  const ver = (it) => `/mi-espacio/grupo/${id}/ver?m=${encodeURIComponent(it.key)}`

  return (
    <main className="page">
      <Link href="/mi-espacio/cursos" className="back"><Icon name="chevron" size={16} /> Mis cursos</Link>
      <div className="greeting">
        <div className="group-head">
          <div className="tiny-art">✦</div>
          <div>
            <span className="eyebrow">{MODALIDAD[grupo.modality] || 'Curso'}</span>
            <h1 style={{ margin: '4px 0' }}>{curso.title}</h1>
            <p>{grupo.name}{grupo.schedule_text ? ` · ${grupo.schedule_text}` : ''}{grupo.starts_on ? ` · inició el ${fechaDia(grupo.starts_on)}` : ''}</p>
          </div>
        </div>
        {!pausado && items.length > 0 && (
          <Link href={ver(items[0])} className="primary"><Icon name="play" size={18} /> Empezar</Link>
        )}
      </div>

      {pausado ? (
        <div className="stack">
          <div className="notice danger">
            <Icon name="lock" />
            <span><b>Acceso pausado por cuota pendiente.</b> En cuanto se registre tu pago, el contenido se habilita de nuevo automáticamente.</span>
          </div>
          {vencidas.map((p) => (
            <div key={p.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span><b>{money(p.amount)} MXN</b><span className="muted" style={{ display: 'block', fontSize: 13 }}>Venció el {fechaDia(p.due_date)}</span></span>
              <Link href="/mi-espacio/pagos" className="primary sm">Ver mis pagos</Link>
            </div>
          ))}
        </div>
      ) : (
        <>
          {proximas.length > 0 && (
            <>
              <div className="section-head"><div><span className="eyebrow">Clases en vivo</span><h2>Próximas sesiones</h2></div></div>
              {proximas.map((s) => (
                <LiveSessionCard key={s.id} session={s} courseTitle={`Sesión ${s.number}`} groupName="" ahoraServidor={ahora} />
              ))}
            </>
          )}

          <div className="section-head"><div><span className="eyebrow">Material del curso</span><h2>Clases grabadas y documentos</h2></div></div>
          {items.length ? (
            <div className="resources" style={{ marginTop: 0 }}>
              {items.map((it) => (
                <Link key={it.key} href={ver(it)} className="resource">
                  <span className="r-icon" style={it.kind === 'pdf' ? undefined : { background: 'var(--purple-soft)', color: 'var(--purple)' }}>
                    <Icon name={it.kind === 'pdf' ? 'file' : 'play'} />
                  </span>
                  <div><b>{it.title}</b><small>{it.etiqueta}</small></div>
                  <span className="secondary sm">{it.kind === 'pdf' ? 'Leer' : 'Ver'} <Icon name="chevron" size={14} /></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card empty-card" style={{ padding: 24 }}>Tu docente aún no ha publicado materiales para este grupo.</div>
          )}

          {grupo.whatsapp_url && (
            <div className="notice info" style={{ marginTop: 20 }}>
              <Icon name="users" />
              <span>¿Tienes dudas? Escríbele a tu grupo. <a href={grupo.whatsapp_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: 'underline' }}>Abrir grupo de WhatsApp</a></span>
            </div>
          )}

          {pasadas.length > 0 && (
            <>
              <div className="section-head"><div><span className="eyebrow">Historial</span><h2>Sesiones anteriores</h2></div></div>
              {pasadas.map((s) => (
                <LiveSessionCard key={s.id} session={s} courseTitle={`Sesión ${s.number}`} groupName="" ahoraServidor={ahora} />
              ))}
            </>
          )}
        </>
      )}
    </main>
  )
}
