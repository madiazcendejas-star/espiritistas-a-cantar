'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { idDeToken } from '@/lib/ligaPago'
import { crearCheckoutCuota } from '@/lib/stripe'

// Pago de una cuota desde la liga (sin iniciar sesión).
export async function pagarConLiga(formData) {
  const token = String(formData.get('token') || '')
  const id = idDeToken(token)
  if (!id) redirect('/')
  const db = createAdminClient()
  const { data: pago } = await db.from('payments').select('id, profile_id, group_id, course_id, amount, due_date, status, courses(title)').eq('id', id).maybeSingle()
  if (!pago || pago.status !== 'pendiente') redirect(`/pagar/${token}`)
  const { data: perfil } = await db.from('profiles').select('id, matricula, first_name, last_name, email').eq('id', pago.profile_id).single()
  let url
  try {
    url = await crearCheckoutCuota({ pago, curso: pago.courses, perfil })
  } catch (e) {
    console.error('pagarConLiga', e)
    redirect(`/pagar/${token}?error=1`)
  }
  redirect(url)
}
