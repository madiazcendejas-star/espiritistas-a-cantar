import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Icon from '@/components/Icon'
import MediaEmbed from '@/components/MediaEmbed'
import { getSessionProfile } from '@/lib/auth'
import { getGrupoConMaterial } from '@/lib/groupContent'

export const metadata = { title: 'Material del curso' }

// Visor dentro de la plataforma: clases grabadas y PDFs sin salir a Drive.
export default async function Ver({ params, searchParams }) {
  const { id } = await params
  const { m } = await searchParams
  if (!/^\d+$/.test(id)) notFound()
  const { supabase } = await getSessionProfile()
  const data = await getGrupoConMaterial(supabase, id)
  if (!data) notFound()
  if (data.pausado) redirect(`/mi-espacio/grupo/${id}`)

  const { items, curso, grupo } = data
  const idx = Math.max(0, items.findIndex((it) => it.key === m))
  const actual = items[idx]
  if (!actual) redirect(`/mi-espacio/grupo/${id}`)
  const anterior = items[idx - 1]
  const siguiente = items[idx + 1]
  const href = (it) => `/mi-espacio/grupo/${id}/ver?m=${encodeURIComponent(it.key)}`

  return (
    <main className="page">
      <Link href={`/mi-espacio/grupo/${id}`} className="back"><Icon name="chevron" size={16} /> {curso.title}</Link>
      <div className="viewer">
        <div>
          <MediaEmbed url={actual.url} kind={actual.kind} title={actual.title} />
          <div className="viewer-head">
            <div>
              <span className="eyebrow">{actual.etiqueta} · {idx + 1} de {items.length}</span>
              <h1>{actual.title}</h1>
              <p>{curso.title} · {grupo.name}</p>
            </div>
          </div>
          <div className="viewer-nav">
            {anterior ? (
              <Link href={href(anterior)} className="secondary"><span style={{ transform: 'rotate(180deg)', display: 'grid' }}><Icon name="chevron" size={16} /></span> Anterior</Link>
            ) : <span />}
            {siguiente ? (
              <Link href={href(siguiente)} className="primary">Siguiente <Icon name="chevron" size={16} /></Link>
            ) : (
              <Link href={`/mi-espacio/grupo/${id}`} className="secondary">Volver al curso</Link>
            )}
          </div>
        </div>
        <aside className="card viewer-list">
          <h3>Material del curso</h3>
          {items.map((it, i) => (
            <Link key={it.key} href={href(it)} className={`lesson ${i === idx ? 'current' : ''}`} aria-current={i === idx ? 'page' : undefined}>
              <span className="l-state"><Icon name={it.kind === 'pdf' ? 'file' : 'play'} size={12} /></span>
              <span className="l-t">{it.title}</span>
              <small>{it.etiqueta}</small>
            </Link>
          ))}
        </aside>
      </div>
    </main>
  )
}
