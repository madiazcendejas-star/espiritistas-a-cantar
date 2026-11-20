import Icon from './Icon'
import { fechaLarga, hora } from '@/lib/format'
import { toEmbed } from '@/lib/embed'

// Materiales y clases en vivo de un grupo. Lo usan administración y docentes,
// cada quien con sus propias acciones (que verifican permisos en el servidor).
export default function GroupContent({ groupId, recursos, sesiones, acciones }) {
  const ahora = Date.now()
  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Material</span><h2>Clases grabadas y PDFs</h2></div></div>
      <div className="resources" style={{ marginTop: 0 }}>
        {(recursos || []).map((r) => (
          <div key={r.id} className="resource">
            <span className="r-icon" style={r.kind === 'pdf' ? undefined : { background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name={r.kind === 'pdf' ? 'file' : 'play'} /></span>
            <div>
              <b>{r.title}</b>
              <small>{r.kind === 'pdf' ? 'PDF' : 'Clase grabada'} · {toEmbed(r.url) ? 'se ve dentro de EAC' : 'se abre aparte (enlace no compatible)'}</small>
            </div>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="ghost sm">Abrir</a>
            <form action={acciones.eliminarRecurso}>
              <input type="hidden" name="id" value={r.id} /><input type="hidden" name="group_id" value={groupId} />
              <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Quitar</button>
            </form>
          </div>
        ))}
        {!recursos?.length && <div className="card empty-card" style={{ padding: 20 }}>Sin materiales todavía.</div>}
      </div>
      <form action={acciones.agregarRecurso} className="card" style={{ padding: 18, marginTop: 12 }}>
        <input type="hidden" name="group_id" value={groupId} />
        <div className="grid3">
          <div className="field"><label>Título</label><input name="title" required placeholder="Ej. Clase 3: Plantas protectoras" /></div>
          <div className="field"><label>Tipo</label><select name="kind" defaultValue="video"><option value="video">Clase grabada (video)</option><option value="pdf">Documento PDF</option></select></div>
          <div className="field"><label>Enlace (Drive, YouTube, Vimeo)</label><input name="url" type="url" required placeholder="https://drive.google.com/file/d/…" /></div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>En Drive, comparte el archivo como «Cualquier persona con el enlace» para que se vea dentro de EAC.</p>
        <button className="primary" type="submit"><Icon name="plus" size={18} /> Agregar material</button>
      </form>

      <div className="section-head"><div><span className="eyebrow">Clases en vivo</span><h2>Sesiones del grupo</h2></div></div>
      <div className="stack">
        {(sesiones || []).map((s) => {
          const pasada = new Date(s.starts_at).getTime() < ahora
          return (
            <details key={s.id} className="card" style={{ padding: 0 }}>
              <summary className="pay-sum" style={{ cursor: 'pointer' }}>
                <span><b>Sesión {s.number}: {s.title}</b></span>
                <span style={{ fontSize: 13 }}>{fechaLarga(s.starts_at)}, {hora(s.starts_at)}</span>
                <span>{s.meet_url ? <i className="status success">Con Meet</i> : <i className="status review">Sin Meet</i>}</span>
                <span>{pasada ? (s.recording_url ? <i className="status info">Grabación</i> : <i className="status neutral">Pasada</i>) : <i className="status success">Próxima</i>}</span>
                <span className="secondary sm">Editar</span>
              </summary>
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--line)' }}>
                <form action={acciones.actualizarSesion} style={{ marginTop: 14 }}>
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="group_id" value={groupId} />
                  <div className="grid2">
                    <div className="field"><label>Enlace de Google Meet</label><input name="meet_url" defaultValue={s.meet_url || ''} placeholder="https://meet.google.com/…" /></div>
                    <div className="field"><label>Grabación (después de la clase)</label><input name="recording_url" defaultValue={s.recording_url || ''} placeholder="https://drive.google.com/file/d/…" /></div>
                  </div>
                  <button className="primary sm" type="submit">Guardar</button>
                </form>
                <form action={acciones.eliminarSesion} style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="group_id" value={groupId} />
                  <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Eliminar sesión</button>
                </form>
              </div>
            </details>
          )
        })}
        {!sesiones?.length && <div className="card empty-card" style={{ padding: 20 }}>Sin sesiones programadas.</div>}
      </div>
      <form action={acciones.agregarSesion} className="card" style={{ padding: 18, marginTop: 12 }}>
        <input type="hidden" name="group_id" value={groupId} />
        <div className="grid3">
          <div className="field"><label>Título</label><input name="title" required placeholder="Ej. Círculo de integración" /></div>
          <div className="field"><label>Fecha</label><input type="date" name="fecha" required /></div>
          <div className="field"><label>Hora (Ciudad de México)</label><input type="time" name="hora" required /></div>
        </div>
        <div className="field"><label>Enlace de Google Meet</label><input name="meet_url" placeholder="https://meet.google.com/…" /></div>
        <button className="primary" type="submit"><Icon name="plus" size={18} /> Programar sesión</button>
      </form>
    </>
  )
}
