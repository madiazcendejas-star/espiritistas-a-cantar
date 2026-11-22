'use server'

import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProducto, tieneProducto } from '@/lib/tienda'
import { crearCheckoutProducto } from '@/lib/stripe'

export async function comprarProducto(formData) {
  const id = Number(formData.get('product_id'))
  const volver = (msg) => redirect(`/tienda/${id}?error=${encodeURIComponent(msg)}`)
  const producto = await getProducto(id)
  if (!producto?.file_path) volver('Este material ya no está disponible.')

  let perfil = null
  try {
    perfil = (await getSessionProfile()).profile
  } catch {}
  const db = createAdminClient()
  if (perfil && (await tieneProducto(db, perfil.id, id))) redirect('/mi-espacio/biblioteca')

  // Materiales gratis: se agregan directo a la biblioteca (requiere cuenta).
  if (!(Number(producto.price) > 0)) {
    if (!perfil) redirect(`/entrar?siguiente=/tienda/${id}`)
    await db.from('product_purchases').insert({ product_id: id, profile_id: perfil.id, amount: 0, source: 'regalo' })
    redirect('/mi-espacio/biblioteca')
  }
  if (Number(producto.price) < 10) volver('Este material no se puede pagar en línea. Escríbenos.')

  let url
  try {
    url = await crearCheckoutProducto({ producto, perfil })
  } catch (e) {
    console.error('comprarProducto', e)
    volver('No pudimos abrir el pago en este momento. Intenta de nuevo en unos minutos.')
  }
  redirect(url)
}
