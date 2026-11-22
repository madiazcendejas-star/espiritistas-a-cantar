import StudentShell from '@/components/StudentShell'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ajustes } from '@/lib/ajustes'
import { waMe } from '@/lib/ligaPago'

export const dynamic = 'force-dynamic'

export default async function MiEspacioLayout({ children }) {
  // Docentes y administración también pueden tener cursos como estudiantes.
  const { profile } = await requireRole(['student', 'teacher', 'admin'], '/mi-espacio')
  let ayuda = null
  try {
    const { whatsapp_ayuda } = await ajustes(createAdminClient(), ['whatsapp_ayuda'])
    ayuda = waMe(whatsapp_ayuda, `Hola, soy ${profile.first_name || ''} (matrícula ${profile.matricula}) y necesito ayuda con EAC Academia.`)
  } catch {}
  return <StudentShell profile={profile} ayuda={ayuda}>{children}</StudentShell>
}
