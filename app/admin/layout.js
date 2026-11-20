import AdminShell from '@/components/AdminShell'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Administración', robots: { index: false, follow: false } }

// /admin no aparece en el menú público. Requiere sesión y rol de administración.
export default async function AdminLayout({ children }) {
  const { profile } = await requireRole(['admin'], '/admin')
  return <AdminShell profile={profile}>{children}</AdminShell>
}
