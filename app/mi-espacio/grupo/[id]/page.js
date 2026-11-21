import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import LiveSessionCard from '@/components/LiveSessionCard'
import { getSessionProfile } from '@/lib/auth'
import { getPagos } from '@/lib/student'
import { getGrupoConMaterial } from '@/lib/groupContent'
import { money, fechaDia, MODALIDAD } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'
import { avanceDelGrupo, constanciaVigente } from '@/lib/constancias'
import { marcarVista } from './actions'

export const metadata = { title: 'Curso' }

export default async function Grupo({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { supabase, profile } = await getSessionProfile()
  const data = await getGrupoConMaterial(supabase, id)
  if (!data) notFound()
  const { grupo, curso, pausado, items, sesiones } = data

  const vencidas = pausado ? (await getPagos(supabase)).filter((p) => p.vencido && String(p.group_id) === String(id)) : []
  const ahora = Date.now()
  const proximas = sesiones.filter((s) => new Date(s.starts_at).getTime() > ahora - 90 * 60000)
  const pasadas = sesiones.filter((s) => new Date(s.starts_at).getTime() <= ahora - 90 * 60000).reverse()
  const ver = (it) => `/mi-espacio/grupo/${id}/ver?m=${encodeURIComponent(it.key)}`
  const db = createAdminClient()
  const [avance, constancia] = pausado ? [null, null] : await Promise.all([avanceDelGrupo(db, profile.id, Number(id)), constanciaVigente(db, profile.id, Number(id))])
  const pct = avance?.total ? Math.round((avance.vistos / avance.total) * 100) : 0

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
          {constancia ? (
            <section className={`card constancia-card ${sp?.constancia === 'nueva' ? 'nueva' : ''}`}>
              <div className="stat-icon"><Icon name="award" /></div>
              <div>
                <b>{sp?.constancia === 'nueva' ? '¡Felicidades! Completaste el curso' : 'Tienes tu constancia de este curso'}</b>
                <span>Folio {constancia.folio} · emitida el {fechaDia(constancia.issued_on)}</span>
              </div>
              <a href={`/api/constancias/${constancia.folio}`} className="primary"><Icon name="file" size={18} /> Descargar constancia</a>
            </section>
          ) : avance?.total > 0 ? (
            <section className="card progreso-card">
              <div className="progreso-head"><b>Tu avance</b><span>{avance.vistos} de {avance.total} clases vistas</span></div>
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
              <small>Marca cada clase grabada como vista. Al completarlas todas, tu constancia se genera sola.</small>
            </section>
          ) : null}

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
              {items.map((it) => {
                const hecho = avance?.hechos?.has(it.key)
                return (
                  <div key={it.key} className="resource">
                    <span className="r-icon" style={hecho ? { background: 'var(--purple)', color: '#fff' } : it.kind === 'pdf' ? undefined : { background: 'var(--purple-soft)', color: 'var(--purple)' }}>
                      <Icon name={hecho ? 'check' : it.kind === 'pdf' ? 'file' : 'play'} />
                    </span>
                    <div><b>{it.title}</b><small>{it.etiqueta}{hecho ? ' · Vista' : ''}</small></div>
                    <Link href={ver(it)} className="secondary sm">{it.kind === 'pdf' ? 'Leer' : 'Ver'} <Icon name="chevron" size={14} /></Link>
                    {it.kind === 'video' && (
                      <form action={marcarVista}>
                        <input type="hidden" name="group_id" value={id} /><input type="hidden" name="key" value={it.key} />
                        <input type="hidden" name="vista" value={hecho ? '0' : '1'} /><input type="hidden" name="volver" value="grupo" />
                        <button type="submit" className="icon-button" aria-label={hecho ? 'Desmarcar como vista' : 'Marcar como vista'} title={hecho ? 'Desmarcar como vista' : 'Marcar como vista'} style={hecho ? { color: 'var(--purple)' } : undefined}>
                          <Icon name="check" size={18} />
                        </button>
                      </form>
                    )}
                  </div>
                )
              })}
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
                <LiveSessionCard key={s.id} session={s} courseTitle={`Sesión ${s.number}`} groupName="" ahoraServidor={ahora} verHref={s.recording_url ? `/mi-espacio/grupo/${id}/ver?m=s-${s.id}` : undefined} />
              ))}
            </>
          )}
        </>
      )}
    </main>
  )
}
