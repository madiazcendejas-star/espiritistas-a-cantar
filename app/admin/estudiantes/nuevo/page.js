import Link from 'next/link'
import Icon from '@/components/Icon'
import Flash from '@/components/Flash'
import GroupSelect, { getGruposParaSelect } from '@/components/GroupSelect'
import { requireAdmin } from '@/lib/admin'
import { crearEstudiante } from '../../actions'

export const metadata = { title: 'Nuevo estudiante' }

export default async function NuevoEstudiante({ searchParams }) {
  const sp = await searchParams
  const { db } = await requireAdmin()
  const grupos = await getGruposParaSelect(db)
  return (
    <main className="page" style={{ maxWidth: 820 }}>
      <Link href="/admin/estudiantes" className="back"><Icon name="chevron" size={16} /> Estudiantes</Link>
      <div className="greeting">
        <div>
          <span className="eyebrow">Alta manual</span>
          <h1>Nuevo estudiante</h1>
          <p>La matrícula se asigna sola. Podrá entrar con su teléfono o su correo y la contraseña temporal.</p>
        </div>
      </div>
      <Flash error={sp?.error} />
      <form action={crearEstudiante} className="card" style={{ padding: 24 }}>
        <div className="grid2">
          <div className="field"><label>Nombre</label><input name="first_name" required /></div>
          <div className="field"><label>Apellidos</label><input name="last_name" /></div>
        </div>
        <div className="grid2">
          <div className="field"><label>Teléfono (10 dígitos)</label><input name="phone" inputMode="tel" placeholder="3312345678" /></div>
          <div className="field"><label>Correo (opcional)</label><input name="email" type="email" placeholder="correo@ejemplo.com" /></div>
        </div>
        <div className="field">
          <label>Contraseña temporal</label>
          <input name="password" minLength={8} required placeholder="Mínimo 8 caracteres" autoComplete="off" />
          <span className="hint">Compártela con la persona; al entrar por primera vez se le pedirá crear la suya.</span>
        </div>
        <div className="field">
          <label>Inscribir a un grupo (opcional)</label>
          <GroupSelect grupos={grupos} />
        </div>
        <div className="check-list">
          <label><input type="checkbox" name="generar_cuotas" /> Generar sus cuotas según el precio y número de pagos del grupo</label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Link href="/admin/estudiantes" className="secondary">Cancelar</Link>
          <button className="primary" type="submit"><Icon name="plus" size={18} /> Dar de alta</button>
        </div>
      </form>
    </main>
  )
}
