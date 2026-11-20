// Selector de grupo agrupado por curso, para formularios de Administración.
export default function GroupSelect({ grupos, name = 'group_id', required = false, vacio = 'Sin curso por ahora' }) {
  const porCurso = {}
  grupos.forEach((g) => {
    const k = g.course_title || 'Curso'
    ;(porCurso[k] ||= []).push(g)
  })
  return (
    <select name={name} required={required} defaultValue="">
      <option value="">{vacio}</option>
      {Object.entries(porCurso).map(([curso, gs]) => (
        <optgroup key={curso} label={curso}>
          {gs.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}{g.installments > 1 ? ` · ${g.installments} pagos` : ''}{g.status !== 'activo' ? ' (inactivo)' : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export async function getGruposParaSelect(db) {
  const [{ data: grupos }, { data: cursos }] = await Promise.all([
    db.from('course_groups').select('id, course_id, name, installments, price_total, status').order('id', { ascending: false }),
    db.from('courses').select('id, title'),
  ])
  const titulo = Object.fromEntries((cursos || []).map((c) => [c.id, c.title]))
  return (grupos || [])
    .map((g) => ({ ...g, course_title: titulo[g.course_id] }))
    .sort((a, b) => (a.course_title || '').localeCompare(b.course_title || '', 'es'))
}
