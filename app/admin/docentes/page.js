import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { fechaDia, money2 } from '@/lib/format'
import { resolverSolicitud } from '../actions'

export const metadata = { title: 'Docentes' }

export default async function DocentesAdmin({ searchParams }) {
  const sp = await searchParams
  const { db } = await requireAdmin()
  const [{ data: solicitudes }, { data: revision }, { data: docentes }, { data: propios }, { data: asignados }, { data: pendientes }] = await Promise.all([
    db.from('teacher_applications').select('*, profiles!teacher_applications_profile_id_fkey(id, matricula, first_name, last_name, email, phone)').eq('status', 'pendiente').order('created_at'),
    db.from('courses').select('id, title, submitted_at, owner_id, profiles!courses_owner_id_fkey(first_name, last_name)').eq('review_status', 'en_revision').order('submitted_at'),
    db.from('profiles').select('id, matricula, first_name, last_name, email').eq('role', 'teacher').order('first_name'),
    db.from('courses').select('owner_id, review_status').not('owner_id', 'is', null),
    db.from('group_teachers').select('profile_id'),
    db.from('teacher_earnings').select('teacher_id, teacher_amount').is('payout_id', null),
  ])
  const cuenta = (arr, k, id) => (arr || []).filter((x) => x[k] === id).length
  const saldo = (id) => (pendientes || []).filter((x) => x.teacher_id === id).reduce((a, x) => a + Number(x.teacher_amount), 0)

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Marketplace</span>
          <h1>Docentes</h1>
          <p>Solicitudes, cursos por revisar y el equipo docente.</p>
        </div>
        <Link href="/admin/liquidaciones" className="secondary"><Icon name="wallet" size={18} /> Liquidaciones</Link>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <div className="section-head" style={{ marginTop: 8 }}><div><span className="eyebrow">Solicitudes</span><h2>Quieren enseñar en EAC {solicitudes?.length ? `(${solicitudes.length})` : ''}</h2></div></div>
      <div className="stack">
        {(solicitudes || []).map((s) => (
          <details key={s.id} className="card" style={{ padding: 0 }}>
            <summary className="pay-sum" style={{ cursor: 'pointer', gridTemplateColumns: '1.6fr 1.4fr 1fr auto' }}>
              <span><b>{nombreCompleto(s.profiles)}</b><small className="muted" style={{ display: 'block' }}>{s.profiles?.email}{s.profiles?.phone ? ` · ${s.profiles.phone}` : ''}</small></span>
              <span>{s.specialty}</span>
              <span className="muted" style={{ fontSize: 13 }}>{fechaDia(s.created_at)}</span>
              <span className="secondary sm">Revisar</span>
            </summary>
            <div style={{ padding: '4px 20px 20px', borderTop: '1px solid var(--line)' }}>
              <p><b>Experiencia</b><br /><span style={{ whiteSpace: 'pre-line' }}>{s.bio}</span></p>
              <p><b>Curso que propone</b><br /><span style={{ whiteSpace: 'pre-line' }}>{s.proposal}</span></p>
              {s.sample_url && <p><a href={s.sample_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple)', fontWeight: 700 }}>Ver su trabajo ↗</a></p>}
              <form action={resolverSolicitud}>
                <input type="hidden" name="id" value={s.id} />
                <div className="field"><label>Mensaje para la persona (opcional)</label><textarea name="review_notes" rows={2} /></div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="primary" type="submit" name="decision" value="aprobar"><Icon name="check" size={18} /> Aprobar como docente</button>
                  <button className="ghost" type="submit" name="decision" value="rechazar" style={{ color: 'var(--rose)' }}>Rechazar</button>
                </div>
              </form>
            </div>
          </details>
        ))}
        {!solicitudes?.length && <div className="card empty-card" style={{ padding: 20 }}>No hay solicitudes pendientes.</div>}
      </div>

      <div className="section-head"><div><span className="eyebrow">Revisión</span><h2>Cursos por revisar {revision?.length ? `(${revision.length})` : ''}</h2></div></div>
      <section className="table-panel">
        {(revision || []).map((c) => (
          <Link key={c.id} href={`/admin/cursos/${c.id}`} className="table-row" style={{ gridTemplateColumns: '2fr 1.4fr 1fr 38px' }}>
            <span><b>{c.title}</b></span>
            <span>{nombreCompleto(c.profiles)}</span>
            <span className="muted">Enviado {fechaDia(c.submitted_at)}</span>
            <Icon name="chevron" size={16} />
          </Link>
        ))}
        {!revision?.length && <div className="empty-card" style={{ padding: 20 }}>No hay cursos esperando revisión.</div>}
      </section>

      <div className="section-head"><div><span className="eyebrow">Equipo</span><h2>Docentes</h2></div></div>
      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '.8fr 1.8fr .9fr .9fr 1fr 38px' }}><span>Matrícula</span><span>Nombre</span><span className="right">Cursos propios</span><span className="right">Grupos EAC</span><span className="right">Por pagar</span><span /></div>
        {(docentes || []).map((d) => (
          <Link key={d.id} href={`/admin/estudiantes/${d.id}`} className="table-row" style={{ gridTemplateColumns: '.8fr 1.8fr .9fr .9fr 1fr 38px' }}>
            <span><b style={{ color: 'var(--purple-dark)' }}>{d.matricula}</b></span>
            <span>{nombreCompleto(d)}<small className="muted" style={{ display: 'block' }}>{d.email}</small></span>
            <span className="right">{cuenta(propios, 'owner_id', d.id)}</span>
            <span className="right">{cuenta(asignados, 'profile_id', d.id)}</span>
            <span className="right">{money2(saldo(d.id))}</span>
            <Icon name="chevron" size={16} />
          </Link>
        ))}
        {!docentes?.length && <div className="empty-card" style={{ padding: 20 }}>Aún no hay docentes aprobados. También puedes convertir a alguien en docente desde su ficha de estudiante.</div>}
      </section>
    </main>
  )
}
