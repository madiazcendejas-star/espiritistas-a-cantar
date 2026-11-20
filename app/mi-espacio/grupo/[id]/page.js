import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import LiveSessionCard from '@/components/LiveSessionCard'
import { getSessionProfile } from '@/lib/auth'
import { getPagos } from '@/lib/student'
import { money, fechaDia, MODALIDAD } from '@/lib/format'

export const metadata = { title: 'Curso' }

function youtubeId(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

const ICONO_RECURSO = { video: 'play', pdf: 'file', documento: 'file', enlace: 'link' }

export default async function Grupo({ params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  const { supabase } = await getSessionProfile()

  const { data: mio } = await supabase.from('my_groups').select('group_id, course_id, enrollment_status, access_state').eq('group_id', id).maybeSingle()
  if (!mio || mio.enrollment_status !== 'activa') notFound()

  const [{ data: grupo }, { data: curso }] = await Promise.all([
    supabase.from('course_groups').select('id, name, modality, starts_on, schedule_text, whatsapp_url').eq('id', id).maybeSingle(),
    supabase.from('courses').select('id, title, description, manual_pdf_url').eq('id', mio.course_id).maybeSingle(),
  ])
  if (!grupo || !curso) notFound()

  const pausado = mio.access_state !== 'activo'
  let recursos = []
  let lecciones = []
  let sesiones = []
  let vencidas = []
  if (pausado) {
    vencidas = (await getPagos(supabase)).filter((p) => p.vencido && String(p.group_id) === String(id))
  } else {
    const [r, l, s] = await Promise.all([
      supabase.from('group_resources').select('id, title, kind, url, created_at').eq('group_id', id).order('created_at', { ascending: true }),
      supabase.from('lessons').select('id, title, video_url, position').eq('course_id', curso.id).order('position', { ascending: true }),
      supabase.from('live_sessions').select('id, group_id, number, title, starts_at, meet_url, recording_url').eq('group_id', id).order('starts_at', { ascending: true }),
    ])
    recursos = r.data || []
    lecciones = l.data || []
    sesiones = s.data || []
  }
  const ahora = Date.now()
  const proximas = sesiones.filter((s) => new Date(s.starts_at).getTime() > ahora - 90 * 60000)
  const pasadas = sesiones.filter((s) => new Date(s.starts_at).getTime() <= ahora - 90 * 60000).reverse()

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
        {grupo.whatsapp_url && !pausado && (
          <a href={grupo.whatsapp_url} target="_blank" rel="noopener noreferrer" className="secondary">Grupo de WhatsApp</a>
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
              <Link href="/mi-espacio/pagos" className="primary sm">Ver cómo pagar</Link>
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

          {lecciones.length > 0 && (
            <>
              <div className="section-head"><div><span className="eyebrow">Lecciones grabadas</span><h2>Lecciones del curso</h2></div></div>
              <div className="stack">
                {lecciones.map((l, i) => {
                  const yt = youtubeId(l.video_url)
                  return (
                    <details key={l.id} className="card" open={i === 0} style={{ padding: 0 }}>
                      <summary style={{ padding: '16px 18px', cursor: 'pointer', fontWeight: 700, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="task-icon purple" style={{ width: 32, height: 32 }}><Icon name="play" size={16} /></span>
                        Lección {i + 1}: {l.title}
                      </summary>
                      <div style={{ padding: '0 18px 18px' }}>
                        {yt ? (
                          <div className="video-embed">
                            <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`} title={l.title} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
                          </div>
                        ) : (
                          <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="primary sm"><Icon name="play" size={16} /> Ver lección</a>
                        )}
                      </div>
                    </details>
                  )
                })}
              </div>
            </>
          )}

          <div className="section-head"><div><span className="eyebrow">Material del curso</span><h2>Recursos y grabaciones</h2></div></div>
          {curso.manual_pdf_url || recursos.length ? (
            <div className="resources" style={{ marginTop: 0 }}>
              {curso.manual_pdf_url && (
                <div className="resource">
                  <span className="r-icon"><Icon name="file" /></span>
                  <div><b>Manual del curso</b><small>PDF</small></div>
                  <a className="secondary sm" href={curso.manual_pdf_url} target="_blank" rel="noopener noreferrer"><Icon name="download" size={16} /> Abrir</a>
                </div>
              )}
              {recursos.map((r) => (
                <div key={r.id} className="resource">
                  <span className="r-icon" style={r.kind === 'video' ? { background: 'var(--purple-soft)', color: 'var(--purple)' } : undefined}>
                    <Icon name={ICONO_RECURSO[r.kind] || 'link'} />
                  </span>
                  <div><b>{r.title}</b><small>{r.kind === 'video' ? 'Video' : r.kind === 'pdf' ? 'PDF' : 'Enlace'}</small></div>
                  <a className="secondary sm" href={r.url} target="_blank" rel="noopener noreferrer">{r.kind === 'video' ? <><Icon name="play" size={16} /> Ver</> : <><Icon name="download" size={16} /> Abrir</>}</a>
                </div>
              ))}
            </div>
          ) : (
            <div className="card empty-card" style={{ padding: 24 }}>Tu docente aún no ha publicado materiales para este grupo.</div>
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
