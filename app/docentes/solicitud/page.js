import Link from 'next/link'
import { redirect } from 'next/navigation'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import Icon from '@/components/Icon'
import SolicitudForm from './SolicitudForm'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Solicitud de docente' }

export default async function SolicitudDocente() {
  const { profile } = await getSessionProfile().catch(() => ({ profile: null }))
  if (profile && ['teacher', 'admin'].includes(profile.role)) redirect('/docente')
  return (
    <>
      <PublicHeader active="docente" />
      <main className="pub-main" style={{ paddingTop: 40, maxWidth: 760 }}>
        <Link href="/docentes" className="back-home"><Icon name="chevron" size={16} /> Enseña en EAC</Link>
        <span className="eyebrow">Docentes</span>
        <h1 style={{ fontWeight: 700, fontSize: 'clamp(26px,3vw,34px)', margin: '8px 0', color: 'var(--ink-2)' }}>Solicitud para enseñar en EAC</h1>
        <p className="muted" style={{ marginBottom: 22 }}>Cuéntanos de ti y del curso que quieres impartir. Revisamos cada solicitud y te respondemos por correo.</p>
        <SolicitudForm conSesion={!!profile} nombre={profile?.first_name} />
      </main>
      <PublicFooter />
    </>
  )
}
