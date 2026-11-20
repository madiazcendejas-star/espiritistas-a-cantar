import Link from 'next/link'
import Icon from '@/components/Icon'
import MiniGrupo from '@/components/MiniGrupo'
import { getSessionProfile } from '@/lib/auth'
import { getMisGrupos } from '@/lib/student'

export const metadata = { title: 'Mis cursos' }

export default async function MisCursos() {
  const { supabase } = await getSessionProfile()
  const grupos = await getMisGrupos(supabase)
  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Tu biblioteca</span>
          <h1>Mis cursos</h1>
          <p>Todos tus cursos y talleres, disponibles siempre que los necesites.</p>
        </div>
        <Link href="/cursos" className="secondary"><Icon name="book" size={16} /> Explorar catálogo</Link>
      </div>
      {grupos.length ? (
        <div className="course-grid">{grupos.map((g) => <MiniGrupo key={g.group_id} g={g} />)}</div>
      ) : (
        <div className="card empty-card"><Icon name="book" size={28} /><b>Aún no tienes cursos</b>Cuando te inscribas, aparecerán aquí.</div>
      )}
    </main>
  )
}
