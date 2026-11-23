import { guardarGrupoDocente } from '@/app/docente/actions'

// Fecha, horario y precio de un grupo de un curso propio.
export default function TeacherGroupForm({ courseId, g }) {
  return (
    <form action={guardarGrupoDocente}>
      {g && <input type="hidden" name="id" value={g.id} />}
      <input type="hidden" name="course_id" value={courseId} />
      <div className="grid3">
        <div className="field"><label>Nombre del grupo</label><input name="name" defaultValue={g?.name || ''} required placeholder="Ej. Generación 1 · Enero 2027" /></div>
        <div className="field">
          <label>Modalidad</label>
          <select name="modality" defaultValue={g?.modality || 'en_linea'}>
            <option value="en_linea">En línea</option><option value="grabado">Grabado</option><option value="presencial">Presencial</option><option value="mixto">Mixto</option>
          </select>
        </div>
        <div className="field"><label>Horario</label><input name="schedule_text" defaultValue={g?.schedule_text || ''} placeholder="Ej. Jueves 7:00 PM" /></div>
      </div>
      <div className="grid3">
        <div className="field"><label>Fecha de inicio</label><input type="date" name="starts_on" defaultValue={g?.starts_on || ''} /></div>
        <div className="field"><label>Fecha de fin</label><input type="date" name="ends_on" defaultValue={g?.ends_on || ''} /></div>
        <div className="field"><label>Cupo (opcional)</label><input name="capacity" inputMode="numeric" defaultValue={g?.capacity ?? ''} /></div>
      </div>
      <div className="grid3">
        <div className="field">
          <label>Forma de cobro</label>
          <select name="recurrence" defaultValue={g?.recurrence || ''}>
            <option value="">Precio total (uno o varios pagos)</option>
            <option value="mensual">Colegiatura mensual</option>
            <option value="quincenal">Colegiatura quincenal</option>
            <option value="semanal">Colegiatura semanal</option>
          </select>
        </div>
        <div className="field"><label>Precio (total, o por periodo)</label><input name="price_total" inputMode="decimal" required defaultValue={g?.price_total ?? ''} /></div>
        <div className="field"><label>Número de pagos (no aplica a colegiaturas)</label><input name="installments" inputMode="numeric" defaultValue={g?.installments ?? 1} /></div>
      </div>
      <div className="field"><label>Grupo de WhatsApp (opcional)</label><input name="whatsapp_url" defaultValue={g?.whatsapp_url || ''} placeholder="https://chat.whatsapp.com/…" /></div>
      <button className="primary" type="submit">{g ? 'Guardar grupo' : 'Agregar grupo'}</button>
    </form>
  )
}
