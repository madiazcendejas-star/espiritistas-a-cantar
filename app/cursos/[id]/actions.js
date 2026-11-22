'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionProfile } from '@/lib/auth'
import { crearCheckoutInscripcion } from '@/lib/stripe'

export async function inscribirme(formData) {
  const cursoId = Number(formData.get('curso_id'))
  const grupoId = Number(formData.get('grupo'))
  const volver = (msg) => redirect(`/cursos/${cursoId}?error=${encodeURIComponent(msg)}#inscripcion`)
  if (!grupoId) volver('Elige una fecha y modalidad.')

  const db = createAdminClient()
  const { data: grupo } = await db
    .from('course_groups')
    .select('id, course_id, name, price_total, installments, recurrence, status, courses(id, title, is_visible)')
    .eq('id', grupoId)
    .maybeSingle()
  if (!grupo || grupo.course_id !== cursoId || grupo.status !== 'activo' || !grupo.courses?.is_visible) volver('Ese grupo ya no está disponible.')
  if (!(Number(grupo.price_total) > 0)) volver('Este grupo aún no tiene precio. Escríbenos para inscribirte.')

  let perfil = null
  try {
    perfil = (await getSessionProfile()).profile
  } catch {}
  if (perfil) {
    const { data: insc } = await db.from('enrollments').select('id').eq('profile_id', perfil.id).eq('group_id', grupoId).eq('status', 'activa').maybeSingle()
    if (insc) redirect(`/mi-espacio/grupo/${grupoId}`)
  }

  let url
  try {
    url = await crearCheckoutInscripcion({ grupo, curso: grupo.courses, perfil })
  } catch (e) {
    console.error('No se pudo crear el checkout', e)
    volver('No pudimos abrir el pago en este momento. Intenta de nuevo en unos minutos.')
  }
  redirect(url)
}
