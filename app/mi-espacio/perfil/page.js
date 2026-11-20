import Icon from '@/components/Icon'
import { getSessionProfile } from '@/lib/auth'
import { cerrarSesion } from '@/app/entrar/actions'
import AgregarCorreo from '@/components/AgregarCorreo'
import { esCorreoTecnico } from '@/lib/cuentas'

export const metadata = { title: 'Mi perfil' }

export default async function Perfil() {
  const { profile, user } = await getSessionProfile()
  const filas = [
    ['Nombre', [profile.first_name, profile.last_name].filter(Boolean).join(' ') || '—'],
    ['Matrícula', profile.matricula],
    ['Teléfono', profile.phone || '—'],
    ['Correo', profile.email || 'Sin correo registrado'],
  ]
  return (
    <main className="page">
      <div className="greeting">
        <div>
          <span className="eyebrow">Mi cuenta</span>
          <h1>Mi perfil</h1>
          <p>Tus datos de acceso y de contacto.</p>
        </div>
      </div>

      {esCorreoTecnico(profile.email) && <AgregarCorreo pendiente={user?.user_metadata?.correo_pendiente || null} />}

      <section className="card" style={{ padding: '6px 22px' }}>
        {filas.map(([k, v]) => (
          <div key={k} className="payout" style={{ margin: 0 }}>
            <div style={{ borderTop: k === 'Nombre' ? 0 : undefined }}><span>{k}</span><b>{v}</b></div>
          </div>
        ))}
      </section>

      <div className="section-head" id="ayuda"><div><span className="eyebrow">Ayuda</span><h2>Preguntas frecuentes</h2></div></div>
      <div className="card faq" style={{ padding: '6px 22px' }}>
        {[
          ['¿Cómo entro a mi clase en vivo?', 'El botón «Unirse a la clase en vivo» se habilita 15 minutos antes, en Mi espacio y en En vivo.'],
          ['¿Dónde están mis materiales?', 'Dentro de cada curso, en «Recursos y grabaciones».'],
          ['¿Por qué dice «acceso pausado»?', 'Tienes una cuota vencida en ese grupo. En cuanto se registre el pago, el acceso vuelve solo.'],
          ['¿Con qué datos entro?', 'Con tu teléfono, tu matrícula o tu correo, y la misma contraseña de siempre.'],
        ].map(([q, a]) => (
          <details key={q}><summary>{q} <Icon name="chevron" size={16} /></summary><p>{a}</p></details>
        ))}
      </div>

      <form action={cerrarSesion} style={{ marginTop: 24 }}>
        <button className="danger" type="submit"><Icon name="logout" size={18} /> Cerrar sesión</button>
      </form>
    </main>
  )
}
