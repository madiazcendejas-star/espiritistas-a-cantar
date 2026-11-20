import Link from 'next/link'
import Brand from '@/components/Brand'
import { confirmarCorreo } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Confirmar correo', robots: { index: false } }

const MENSAJES = {
  listo: ['¡Listo!', 'Tu correo quedó confirmado. Desde ahora puedes entrar con tu correo, tu teléfono o tu matrícula, y recuperar tu contraseña si la olvidas.'],
  ya: ['Tu correo ya estaba confirmado', 'No tienes que hacer nada más.'],
  expirado: ['El enlace expiró', 'Entra a tu espacio y vuelve a escribir tu correo para recibir uno nuevo.'],
  ocupado: ['Ese correo ya está en otra cuenta', 'Escríbenos por WhatsApp y lo revisamos contigo.'],
  invalido: ['Enlace no válido', 'Entra a tu espacio y vuelve a escribir tu correo para recibir uno nuevo.'],
  error: ['Algo salió mal', 'Intenta de nuevo en unos minutos o escríbenos por WhatsApp.'],
}

export default async function ConfirmarCorreo({ searchParams }) {
  const { p, t, estado } = await searchParams
  const [titulo, texto] = MENSAJES[estado] || []

  return (
    <div className="auth-form" style={{ minHeight: '100vh' }}>
      <div>
        <div style={{ marginBottom: 24 }}><Brand /></div>
        <span className="eyebrow">Confirmar correo</span>
        {titulo ? (
          <>
            <h1>{titulo}</h1>
            <p className="sub">{texto}</p>
            <Link href="/mi-espacio" className="primary full" style={{ minHeight: 50 }}>Ir a mi espacio</Link>
          </>
        ) : p && t ? (
          <>
            <h1>Confirma tu correo</h1>
            <p className="sub">Toca el botón para terminar.</p>
            <form action={confirmarCorreo}>
              <input type="hidden" name="p" value={p} />
              <input type="hidden" name="t" value={t} />
              <button className="primary full" type="submit" style={{ minHeight: 50 }}>Confirmar mi correo</button>
            </form>
          </>
        ) : (
          <>
            <h1>Enlace no válido</h1>
            <p className="sub">{MENSAJES.invalido[1]}</p>
            <Link href="/mi-espacio" className="primary full" style={{ minHeight: 50 }}>Ir a mi espacio</Link>
          </>
        )}
      </div>
    </div>
  )
}
