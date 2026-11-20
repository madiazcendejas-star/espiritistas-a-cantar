'use server'

import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { crearCheckoutCuota } from '@/lib/stripe'

export async function pagarCuota(formData) {
  const pagoId = Number(formData.get('payment_id'))
  const volver = (msg) => redirect(`/mi-espacio/pagos?error=${encodeURIComponent(msg)}`)
  const { supabase, profile } = await getSessionProfile()
  if (!profile) redirect('/entrar?siguiente=/mi-espacio/pagos')

  // Con la sesión del estudiante: RLS solo deja ver sus propios pagos.
  const { data: pago } = await supabase
    .from('payments')
    .select('id, profile_id, group_id, course_id, amount, due_date, status, courses(title)')
    .eq('id', pagoId)
    .maybeSingle()
  if (!pago || pago.profile_id !== profile.id) volver('No encontramos esa cuota.')
  if (pago.status !== 'pendiente') volver('Esa cuota ya no está pendiente.')
  if (!(Number(pago.amount) >= 10)) volver('Esta cuota no se puede pagar en línea. Escríbenos por WhatsApp.')

  let url
  try {
    url = await crearCheckoutCuota({ pago, curso: pago.courses, perfil: profile })
  } catch (e) {
    console.error('pagarCuota', e)
    volver('No pudimos abrir el pago en este momento. Intenta de nuevo en unos minutos.')
  }
  redirect(url)
}
