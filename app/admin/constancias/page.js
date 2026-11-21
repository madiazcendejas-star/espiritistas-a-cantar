import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import Sello from '@/components/Sello'
import { requireAdmin } from '@/lib/admin'
import { firmaConstancia } from '@/lib/constancias'
import { fechaDia } from '@/lib/format'
import { revocarConstancia, actualizarNombreConstancia, guardarFirma, guardarRuta, eliminarRuta } from '../actions'

export const metadata = { title: 'Constancias e insignias' }

function RutaForm({ ruta, cursos }) {
  const elegidos = new Set((ruta?.learning_path_courses || []).map((x) => x.course_id))
  return (
    <form action={guardarRuta}>
      {ruta && <input type="hidden" name="id" value={ruta.id} />}
      <div className="grid3">
        <div className="field"><label>Nombre de la ruta</label><input name="title" defaultValue={ruta?.title || ''} required placeholder="Ej. Lectura de Tarot" /></div>
        <div className="field"><label>Color del sello</label><input name="color" type="color" defaultValue={ruta?.color || '#6e3fc3'} style={{ height: 42, padding: 4 }} /></div>
        <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}><label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" name="is_active" defaultChecked={ruta ? ruta.is_active : true} /> Visible para estudiantes</label></div>
      </div>
      <div className="field"><label>Descripción (opcional)</label><input name="description" defaultValue={ruta?.description || ''} /></div>
      <div className="field">
        <label>Cursos que la forman (al menos 2)</label>
        <div className="ruta-cursos">
          {cursos.map((c) => (
            <label key={c.id}><input type="checkbox" name="course_id" value={c.id} defaultChecked={elegidos.has(c.id)} /> {c.title}</label>
          ))}
        </div>
      </div>
      <button className="primary" type="submit">{ruta ? 'Guardar ruta' : 'Crear ruta'}</button>
    </form>
  )
}

export default async function ConstanciasAdmin({ searchParams }) {
  const sp = await searchParams
  const q = String(sp?.q || '').trim()
  const { db } = await requireAdmin()

  let consulta = db.from('certificates').select('folio, full_name, matricula, course_title, group_name, issued_on, method, revoked_at, profile_id').order('created_at', { ascending: false }).limit(50)
  if (q) {
    const limpio = q.replace(/[%_,()\\]/g, '')
    consulta = /^EAC-/i.test(limpio) ? consulta.ilike('folio', limpio) : consulta.or(`full_name.ilike.%${limpio}%,matricula.ilike.${limpio},course_title.ilike.%${limpio}%`)
  }
  const [{ data: constancias }, { data: rutas }, { data: cursos }, firma, { count: total }] = await Promise.all([
    consulta,
    db.from('learning_paths').select('*, learning_path_courses(course_id)').order('created_at'),
    db.from('courses').select('id, title').eq('review_status', 'aprobado').order('title'),
    firmaConstancia(db),
    db.from('certificates').select('id', { count: 'exact', head: true }).is('revoked_at', null),
  ])
  const titulo = (id) => (cursos || []).find((c) => c.id === id)?.title

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Logros</span>
          <h1>Constancias e insignias</h1>
          <p>{total || 0} constancias vigentes. Se emiten solas al ver todas las grabaciones, o a mano desde la ficha del estudiante.</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <form className="search-row" style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input name="q" defaultValue={q} placeholder="Buscar por folio, nombre, matrícula o curso" style={{ flex: 1, minHeight: 44 }} />
        <button className="secondary" type="submit">Buscar</button>
      </form>
      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '1fr 1.6fr 1.8fr .9fr .9fr 1.2fr' }}><span>Folio</span><span>Nombre</span><span>Curso</span><span>Fecha</span><span>Tipo</span><span /></div>
        {(constancias || []).map((c) => (
          <div key={c.folio} className="table-row" style={{ gridTemplateColumns: '1fr 1.6fr 1.8fr .9fr .9fr 1.2fr' }}>
            <span><b style={{ color: c.revoked_at ? 'var(--muted)' : 'var(--purple-dark)', textDecoration: c.revoked_at ? 'line-through' : undefined }}>{c.folio}</b></span>
            <span><Link href={`/admin/estudiantes/${c.profile_id}`} style={{ fontWeight: 600 }}>{c.full_name}</Link></span>
            <span>{c.course_title}{c.group_name && <small className="muted" style={{ display: 'block' }}>{c.group_name}</small>}</span>
            <span>{fechaDia(c.issued_on)}</span>
            <span>{c.revoked_at ? <i className="status neutral">Cancelada</i> : c.method === 'manual' ? <i className="status info">Manual</i> : <i className="status success">Automática</i>}</span>
            <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {!c.revoked_at && (
                <>
                  <a href={`/api/constancias/${c.folio}`} className="ghost sm">PDF</a>
                  <details>
                    <summary className="ghost sm" style={{ cursor: 'pointer', listStyle: 'none' }}>Más</summary>
                    <div className="card" style={{ position: 'absolute', right: 20, zIndex: 5, padding: 12, width: 260 }}>
                      <form action={actualizarNombreConstancia}>
                        <input type="hidden" name="folio" value={c.folio} />
                        <button className="secondary sm full" type="submit">Usar el nombre actual del perfil</button>
                      </form>
                      <form action={revocarConstancia} style={{ marginTop: 8 }}>
                        <input type="hidden" name="folio" value={c.folio} />
                        <input name="motivo" placeholder="Motivo (opcional)" style={{ width: '100%', marginBottom: 6 }} />
                        <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Cancelar constancia</button>
                      </form>
                    </div>
                  </details>
                </>
              )}
            </span>
          </div>
        ))}
        {!constancias?.length && <div className="empty-card" style={{ padding: 20 }}>{q ? `Sin resultados para «${q}».` : 'Aún no se ha emitido ninguna constancia.'}</div>}
      </section>

      <div className="section-head"><div><span className="eyebrow">Sellos de sabiduría</span><h2>Rutas de aprendizaje</h2></div></div>
      <div className="stack">
        {(rutas || []).map((r) => (
          <details key={r.id} className="card" style={{ padding: 0 }}>
            <summary style={{ cursor: 'pointer', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Sello color={r.color} titulo={r.title} ganado={r.is_active} size={52} />
              <span style={{ flex: 1 }}>
                <b>{r.title}</b>{!r.is_active && <i className="status neutral" style={{ marginLeft: 8 }}>Oculta</i>}
                <small className="muted" style={{ display: 'block' }}>{(r.learning_path_courses || []).map((x) => titulo(x.course_id)).filter(Boolean).join(' · ')}</small>
              </span>
              <span className="secondary sm">Editar</span>
            </summary>
            <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--line)' }}>
              <div style={{ marginTop: 14 }}><RutaForm ruta={r} cursos={cursos || []} /></div>
              <form action={eliminarRuta} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={r.id} />
                <button className="ghost sm" type="submit" style={{ color: 'var(--rose)' }}>Eliminar ruta</button>
              </form>
            </div>
          </details>
        ))}
        {!rutas?.length && <div className="card empty-card" style={{ padding: 20 }}>Aún no hay rutas. Crea la primera: agrupa 2 o más cursos de un mismo tema y, al tener la constancia de todos, la persona gana su sello.</div>}
      </div>
      <details className="card" style={{ padding: 20, marginTop: 12 }} open={!rutas?.length}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>+ Crear una ruta</summary>
        <div style={{ marginTop: 14 }}><RutaForm cursos={cursos || []} /></div>
      </details>

      <div className="section-head"><div><span className="eyebrow">Diseño</span><h2>Firma de las constancias</h2></div></div>
      <form action={guardarFirma} className="card" style={{ padding: 22 }}>
        <div className="grid2">
          <div className="field"><label>Nombre que firma</label><input name="firma_nombre" defaultValue={firma.firmaNombre} placeholder="Ej. Mtra. Ana López" /></div>
          <div className="field"><label>Cargo</label><input name="firma_cargo" defaultValue={firma.firmaCargo} placeholder="Ej. Directora académica" /></div>
        </div>
        <button className="secondary" type="submit">Guardar firma</button>
      </form>
    </main>
  )
}
