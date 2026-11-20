import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import { requireAdmin, nombreCompleto } from '@/lib/admin'
import { hoyMx } from '@/lib/format'

export const metadata = { title: 'Estudiantes y accesos' }
const POR_PAGINA = 40

export default async function Estudiantes({ searchParams }) {
  const sp = await searchParams
  const { db } = await requireAdmin()
  const q = String(sp?.q || '').trim()
  const filtro = sp?.filtro || ''
  const pagina = Math.max(1, Number(sp?.p) || 1)

  let query = db
    .from('profiles')
    .select('id, matricula, first_name, last_name, phone, email, source, auth_user_id', { count: 'exact' })
    .eq('role', 'student')
    .order('id', { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
  if (filtro === 'sin-correo') query = query.is('email', null)
  if (q) {
    const limpio = q.replace(/[%_,()\\]/g, ' ').trim()
    const dig = q.replace(/\D/g, '')
    const ors = [`first_name.ilike.%${limpio}%`, `last_name.ilike.%${limpio}%`, `matricula.ilike.%${limpio}%`, `email.ilike.%${limpio}%`]
    if (dig.length >= 4) ors.push(`phone10.ilike.%${dig.slice(-10)}%`)
    query = query.or(ors.join(','))
  }
  const { data: lista, count } = await query
  const ids = (lista || []).map((p) => p.id)

  const [{ data: inscripciones }, { data: vencidas }] = ids.length
    ? await Promise.all([
        db.from('enrollments').select('profile_id, status').in('profile_id', ids),
        db.from('payments').select('profile_id').in('profile_id', ids).eq('status', 'pendiente').lt('due_date', hoyMx()),
      ])
    : [{ data: [] }, { data: [] }]
  const activos = (id) => (inscripciones || []).filter((e) => e.profile_id === id && e.status === 'activa').length
  const conVencida = new Set((vencidas || []).map((v) => v.profile_id))
  const paginas = Math.max(1, Math.ceil((count || 0) / POR_PAGINA))
  const link = (p) => `/admin/estudiantes?${new URLSearchParams({ ...(q && { q }), ...(filtro && { filtro }), p: String(p) })}`

  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Matrículas y accesos</span>
          <h1>Estudiantes</h1>
          <p>{count ?? 0} {filtro === 'sin-correo' ? 'sin correo registrado' : 'estudiantes registrados'}.</p>
        </div>
        <Link href="/admin/estudiantes/nuevo" className="primary"><Icon name="plus" size={18} /> Nuevo estudiante</Link>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <form className="toolbar" action="/admin/estudiantes">
        <label className="search">
          <Icon name="user" size={18} />
          <input name="q" defaultValue={q} placeholder="Buscar por nombre, matrícula, teléfono o correo" />
        </label>
        {filtro && <input type="hidden" name="filtro" value={filtro} />}
        <button className="secondary" type="submit">Buscar</button>
        {(q || filtro) && <Link href="/admin/estudiantes" className="ghost">Limpiar</Link>}
      </form>

      <section className="table-panel">
        <div className="table-row table-header" style={{ gridTemplateColumns: '.8fr 1.8fr 1.1fr 1.6fr .8fr .9fr 38px' }}>
          <span>Matrícula</span><span>Nombre</span><span>Teléfono</span><span>Correo</span><span>Accesos</span><span>Estado</span><span />
        </div>
        {(lista || []).map((p) => (
          <Link key={p.id} href={`/admin/estudiantes/${p.id}`} className="table-row" style={{ gridTemplateColumns: '.8fr 1.8fr 1.1fr 1.6fr .8fr .9fr 38px' }}>
            <span><b style={{ color: 'var(--purple-dark)' }}>{p.matricula}</b></span>
            <span className="person"><i>{(p.first_name || '?')[0]}{(p.last_name || '')[0] || ''}</i><b>{nombreCompleto(p)}</b></span>
            <span>{p.phone || '—'}</span>
            <span style={{ color: p.email ? undefined : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email || 'Sin correo'}</span>
            <span>{activos(p.id)}</span>
            <span>
              {!p.auth_user_id ? <i className="status neutral">Sin cuenta</i>
                : conVencida.has(p.id) ? <i className="status danger">Cuota vencida</i>
                : activos(p.id) ? <i className="status success">Activo</i>
                : <i className="status neutral">Sin cursos</i>}
            </span>
            <Icon name="chevron" size={17} />
          </Link>
        ))}
        {!lista?.length && <div className="empty-card">No hay resultados{q ? ` para «${q}»` : ''}.</div>}
      </section>

      {paginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16, alignItems: 'center' }}>
          {pagina > 1 && <Link href={link(pagina - 1)} className="secondary sm">Anterior</Link>}
          <span className="muted" style={{ fontSize: 13 }}>Página {pagina} de {paginas}</span>
          {pagina < paginas && <Link href={link(pagina + 1)} className="secondary sm">Siguiente</Link>}
        </div>
      )}
    </main>
  )
}
