import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import PaymentRow from '@/components/PaymentRow'
import GroupSelect, { getGruposParaSelect } from '@/components/GroupSelect'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { hoyMx, fechaLarga } from '@/lib/format'
import { actualizarEstudiante, restablecerContrasena, inscribir, cambiarEstatusInscripcion, agregarCuota, cambiarRol } from '../../actions'

export const metadata = { title: 'Estudiante' }

export default async function Estudiante({ params, searchParams }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { db } = await requireAdmin()
  const { data: p } = await db.from('profiles').select('*').eq('id', id).maybeSingle()
  if (!p) notFound()

  const [{ data: inscripciones }, { data: pagos }, grupos, { data: accesos }] = await Promise.all([
    db.from('enrollments').select('id, group_id, course_id, status, drop_reason, source, enrolled_at').eq('profile_id', id).order('enrolled_at', { ascending: false }),
    db.from('payments').select('*').eq('profile_id', id).order('due_date', { ascending: true, nullsFirst: false }),
    getGruposParaSelect(db),
    db.from('access_log').select('accessed_at').eq('profile_id', id).order('accessed_at', { ascending: false }).limit(1),
  ])
  const grupo = (gid) => grupos.find((g) => g.id === gid)
  const hoy = hoyMx()
  const vencidaEn = (gid) => (pagos || []).some((x) => x.group_id === gid && x.status === 'pendiente' && x.due_date && x.due_date < hoy)
  const regreso = `/admin/estudiantes/${id}`
  const abiertos = (pagos || []).filter((x) => x.status === 'pendiente' || x.status === 'en_revision')
  const cerrados = (pagos || []).filter((x) => !(x.status === 'pendiente' || x.status === 'en_revision')).reverse()

  return (
    <main className="page">
      <Link href="/admin/estudiantes" className="back"><Icon name="chevron" size={16} /> Estudiantes</Link>
      <div className="greeting">
        <div className="group-head">
          <span className="avatar" style={{ width: 56, height: 56, fontSize: 16 }}>{(p.first_name || '?')[0]}{(p.last_name || '')[0] || ''}</span>
          <div>
            <span className="eyebrow">Matrícula {p.matricula}</span>
            <h1 style={{ margin: '4px 0' }}>{nombreCompleto(p)}</h1>
            <p>
              {p.source === 'migracion' ? 'Migrado de la plataforma anterior' : 'Alta en EAC v2'}
              {accesos?.[0] ? ` · último acceso ${fechaLarga(accesos[0].accessed_at)}` : ''}
              {!p.auth_user_id ? ' · sin cuenta de acceso' : ''}
            </p>
          </div>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Accesos</span><h2>Cursos y grupos</h2></div></div>
      <section className="table-panel">
        {(inscripciones || []).map((e) => {
          const g = grupo(e.group_id)
          const pausado = e.status === 'activa' && vencidaEn(e.group_id)
          return (
            <div key={e.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr auto' }}>
              <span><b>{g?.course_title || 'Curso'}</b><small className="muted" style={{ display: 'block', fontSize: 12 }}>{g?.name}{e.drop_reason ? ` · Baja: ${e.drop_reason}` : ''}</small></span>
              <span>
                {e.status === 'baja' ? <i className="status neutral">Baja</i> : pausado ? <i className="status danger">Pausado por cuota</i> : <i className="status success">Activo</i>}
              </span>
              <form action={cambiarEstatusInscripcion} style={{ display: 'flex', gap: 8 }}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="profile_id" value={id} />
                <input type="hidden" name="status" value={e.status === 'activa' ? 'baja' : 'activa'} />
                <button className="ghost sm" type="submit" style={e.status === 'activa' ? { color: 'var(--rose)' } : undefined}>{e.status === 'activa' ? 'Dar de baja' : 'Reactivar'}</button>
              </form>
            </div>
          )
        })}
        {!inscripciones?.length && <div className="empty-card" style={{ padding: 20 }}>Sin cursos asignados.</div>}
      </section>
      <form action={inscribir} className="card inline-form" style={{ padding: 18, marginTop: 12 }}>
        <input type="hidden" name="profile_id" value={id} />
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Asignar acceso a un grupo</label>
          <GroupSelect grupos={grupos} required vacio="Elige un grupo…" />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 13, marginTop: 8 }}>
            <input type="checkbox" name="generar_cuotas" style={{ width: 'auto', accentColor: 'var(--purple)' }} /> Generar sus cuotas según el grupo
          </label>
        </div>
        <button className="primary" type="submit"><Icon name="plus" size={18} /> Asignar</button>
      </form>

      <div className="section-head"><div><span className="eyebrow">Pagos</span><h2>Cuotas pendientes</h2></div></div>
      <div className="stack">
        {abiertos.map((x) => <PaymentRow key={x.id} p={x} contexto={grupo(x.group_id)?.course_title || 'Pago'} regreso={regreso} />)}
        {!abiertos.length && <div className="card empty-card" style={{ padding: 20 }}>Al corriente: sin cuotas pendientes.</div>}
      </div>
      <details className="card" style={{ padding: 18, marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>+ Agregar una cuota o registrar un pago nuevo</summary>
        <form action={agregarCuota} style={{ marginTop: 14 }}>
          <input type="hidden" name="profile_id" value={id} />
          <div className="grid3">
            <div className="field"><label>Grupo</label><GroupSelect grupos={grupos} vacio="Sin grupo (otro concepto)" /></div>
            <div className="field"><label>Monto (MXN)</label><input name="amount" inputMode="decimal" required /></div>
            <div className="field"><label>Vence el</label><input type="date" name="due_date" defaultValue={hoy} /></div>
          </div>
          <div className="field"><label>Nota (opcional)</label><input name="notes" placeholder="Ej. inscripción, material, ajuste" /></div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 13 }}>
              <input type="checkbox" name="ya_pagado" style={{ accentColor: 'var(--purple)' }} /> Ya está pagado
            </label>
            <select name="method" defaultValue="transferencia" style={{ border: '1px solid var(--line-strong)', borderRadius: 10, padding: '9px 10px' }}>
              <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="spei">SPEI</option><option value="oxxo">OXXO</option><option value="otro">Otro</option>
            </select>
            <button className="secondary" type="submit">Guardar</button>
          </div>
        </form>
      </details>
      {cerrados.length > 0 && (
        <>
          <div className="section-head"><div><span className="eyebrow">Historial</span><h2>Pagos anteriores</h2></div></div>
          <div className="stack">{cerrados.map((x) => <PaymentRow key={x.id} p={x} contexto={grupo(x.group_id)?.course_title || 'Pago'} regreso={regreso} />)}</div>
        </>
      )}

      <div className="section-head"><div><span className="eyebrow">Datos</span><h2>Datos de contacto y acceso</h2></div></div>
      <div className="two-col">
        <form action={actualizarEstudiante} className="card" style={{ padding: 22 }}>
          <input type="hidden" name="id" value={id} />
          <div className="grid2">
            <div className="field"><label>Nombre</label><input name="first_name" defaultValue={p.first_name || ''} /></div>
            <div className="field"><label>Apellidos</label><input name="last_name" defaultValue={p.last_name || ''} /></div>
          </div>
          <div className="field"><label>Teléfono</label><input name="phone" defaultValue={p.phone || ''} /></div>
          <div className="field">
            <label>Correo</label>
            <input name="email" type="email" defaultValue={p.email || ''} placeholder="Sin correo" />
            <span className="hint">Si agregas o cambias el correo, también cambia el correo con el que entra.</span>
          </div>
          <button className="primary" type="submit">Guardar datos</button>
        </form>
        <form action={restablecerContrasena} className="card" style={{ padding: 22 }}>
          <input type="hidden" name="id" value={id} />
          <span className="eyebrow">Acceso</span>
          <h3 style={{ fontWeight: 700, fontSize: 17, margin: '6px 0 10px' }}>Restablecer contraseña</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Asigna una contraseña temporal. Al entrar se le pedirá crear una nueva.</p>
          <div className="field"><label>Contraseña temporal</label><input name="password" minLength={8} required autoComplete="off" /></div>
          <button className="secondary" type="submit"><Icon name="lock" size={16} /> Asignar contraseña temporal</button>
        </form>
        {p.role !== 'admin' && (
          <form action={cambiarRol} className="card" style={{ padding: 22 }}>
            <input type="hidden" name="id" value={id} />
            <span className="eyebrow">Rol</span>
            <h3 style={{ fontWeight: 700, fontSize: 17, margin: '6px 0 10px' }}>{p.role === 'teacher' ? 'Es docente' : 'Es estudiante'}</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              {p.role === 'teacher'
                ? 'Tiene acceso al portal docente. Sus cursos y grupos asignados se conservan si le quitas el rol.'
                : 'Dale el rol de docente para que entre al portal docente y puedas asignarle grupos o cursos.'}
            </p>
            <input type="hidden" name="role" value={p.role === 'teacher' ? 'student' : 'teacher'} />
            <button className="secondary" type="submit">{p.role === 'teacher' ? 'Quitar rol de docente' : 'Hacer docente'}</button>
          </form>
        )}
      </div>
    </main>
  )
}
