import StudentShell from '@/components/StudentShell'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function MiEspacioLayout({ children }) {
  // Docentes y administración también pueden tener cursos como estudiantes.
  const { profile } = await requireRole(['student', 'teacher', 'admin'], '/mi-espacio')
  return <StudentShell profile={profile}>{children}</StudentShell>
}
