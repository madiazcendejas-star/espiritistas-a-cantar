import { CATEGORIAS } from '@/lib/catalog'

// Categorías, nivel y número de módulos de un curso.
export default function CamposCatalogo({ c }) {
  const elegidas = new Set(c?.categories || [])
  return (
    <>
      <div className="field">
        <label>Categorías (aparece en estas secciones del catálogo)</label>
        <div className="ruta-cursos" style={{ maxHeight: 'none' }}>
          {CATEGORIAS.map((cat) => (
            <label key={cat.slug}><input type="checkbox" name="categories" value={cat.slug} defaultChecked={elegidas.has(cat.slug)} /> {cat.simbolo} {cat.nombre}</label>
          ))}
        </div>
      </div>
      <div className="grid2">
        <div className="field">
          <label>Nivel</label>
          <select name="level" defaultValue={c?.level || ''}>
            <option value="">Sin indicar</option>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
            <option value="todos">Todos los niveles</option>
          </select>
        </div>
        <div className="field"><label>Número de módulos (opcional)</label><input name="modules_count" inputMode="numeric" defaultValue={c?.modules_count ?? ''} placeholder="Ej. 8" /></div>
      </div>
    </>
  )
}
