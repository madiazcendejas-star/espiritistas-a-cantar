import Flash from '@/components/Flash'
import { requireTeacher } from '@/lib/docente'
import { guardarPerfilDocente } from '../actions'

export const metadata = { title: 'Mi perfil docente' }

export default async function PerfilDocente({ searchParams }) {
  const sp = await searchParams
  const { profile, db } = await requireTeacher()
  const { data: t } = await db.from('teacher_profiles').select('*').eq('profile_id', profile.id).maybeSingle()

  return (
    <main className="page" style={{ maxWidth: 860 }}>
      <div className="greeting">
        <div>
          <span className="eyebrow">Portal docente</span>
          <h1>Mi perfil docente</h1>
          <p>Cómo te presentamos y a dónde te enviamos tus pagos.</p>
        </div>
      </div>
      <Flash ok={sp?.ok} error={sp?.error} />

      <form action={guardarPerfilDocente} className="card" style={{ padding: 22 }}>
        <div className="field"><label>Especialidad</label><input name="specialty" defaultValue={t?.specialty || ''} placeholder="Ej. Tarot evolutivo, herbolaria, reiki" /></div>
        <div className="field"><label>Semblanza</label><textarea name="bio" rows={5} defaultValue={t?.bio || ''} placeholder="Tu experiencia y tu forma de enseñar" /></div>
        <div className="field"><label>Enlace a tu trabajo (redes, sitio o video)</label><input name="sample_url" type="url" defaultValue={t?.sample_url || ''} placeholder="https://…" /></div>

        <div style={{ borderTop: '1px solid var(--line)', margin: '18px 0', paddingTop: 18 }}>
          <span className="eyebrow">Datos para tus pagos</span>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Titular, banco y CLABE</label>
            <textarea name="payout_info" rows={3} defaultValue={t?.payout_info || ''} placeholder={'Nombre del titular\nBanco\nCLABE (18 dígitos)'} />
            <small className="muted" style={{ fontSize: 12 }}>Solo tú y la administración de EAC pueden ver estos datos.</small>
          </div>
        </div>
        <button className="primary" type="submit">Guardar perfil</button>
      </form>
      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>Matrícula {profile.matricula} · {profile.email || 'sin correo registrado'}</p>
    </main>
  )
}
