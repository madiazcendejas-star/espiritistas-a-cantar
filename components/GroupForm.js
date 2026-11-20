import { guardarGrupo } from '@/app/admin/actions'

// Formulario de grupo (crear o editar). Las parcialidades se definen con
// "Número de pagos"; al inscribir a alguien se pueden generar sus cuotas.
export default function GroupForm({ courseId, g }) {
  return (
    <form action={guardarGrupo}>
      {g && <input type="hidden" name="id" value={g.id} />}
      <input type="hidden" name="course_id" value={courseId} />
      <div className="grid3">
        <div className="field"><label>Nombre del grupo</label><input name="name" defaultValue={g?.name || ''} required placeholder="Ej. Generación 8 · Marzo 2027" /></div>
        <div className="field">
          <label>Modalidad</label>
          <select name="modality" defaultValue={g?.modality || 'en_linea'}>
            <option value="en_linea">En línea</option><option value="presencial">Presencial</option><option value="grabado">Grabado</option><option value="mixto">Mixto</option>
          </select>
        </div>
        <div className="field">
          <label>Estado</label>
          <select name="status" defaultValue={g?.status || 'activo'}>
            <option value="activo">Activo (aparece en la ficha del curso)</option><option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>
      <div className="grid3">
        <div className="field"><label>Fecha de inicio</label><input type="date" name="starts_on" defaultValue={g?.starts_on || ''} /></div>
        <div className="field"><label>Fecha de fin</label><input type="date" name="ends_on" defaultValue={g?.ends_on || ''} /></div>
        <div className="field"><label>Horario</label><input name="schedule_text" defaultValue={g?.schedule_text || ''} placeholder="Ej. Martes 7:00 PM" /></div>
      </div>
      <div className="grid3">
        <div className="field"><label>Precio total (MXN)</label><input name="price_total" inputMode="decimal" defaultValue={g?.price_total ?? ''} /></div>
        <div className="field"><label>Número de pagos</label><input name="installments" inputMode="numeric" defaultValue={g?.installments ?? 1} /></div>
        <div className="field"><label>Cupo</label><input name="capacity" inputMode="numeric" defaultValue={g?.capacity ?? ''} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label>Cuota de inscripción (MXN, opcional)</label><input name="enrollment_fee" inputMode="decimal" defaultValue={g?.enrollment_fee ?? 0} /></div>
        <div className="field"><label>Enlace del grupo de WhatsApp (opcional)</label><input name="whatsapp_url" defaultValue={g?.whatsapp_url || ''} /></div>
      </div>
      <input type="hidden" name="frequency" value={g?.frequency || 'mensual'} />
      <button className="primary" type="submit">{g ? 'Guardar grupo' : 'Crear grupo'}</button>
    </form>
  )
}
