import TeacherShell from '@/components/TeacherShell'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function DocenteLayout({ children }) {
  const { profile } = await requireRole(['teacher', 'admin'], '/docente')
  return <TeacherShell profile={profile}>{children}</TeacherShell>
}
