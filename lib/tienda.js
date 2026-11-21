import 'server-only'
import { createAdminClient } from './supabase/admin'

export const TIPO_PRODUCTO = { ebook: 'Ebook', workbook: 'Cuaderno de trabajo', mazo: 'Mazo imprimible', guia: 'Guía' }
const COLS = 'id, kind, title, subtitle, description, author, pages, price, cover_url, file_name, file_size, is_featured'

export async function getTienda() {
  const { data } = await createAdminClient().from('products').select(COLS).eq('is_visible', true).not('file_path', 'is', null)
    .order('is_featured', { ascending: false }).order('created_at', { ascending: false })
  return data || []
}

export async function getProducto(id, { soloVisibles = true } = {}) {
  let q = createAdminClient().from('products').select(`${COLS}, is_visible, file_path`).eq('id', id)
  if (soloVisibles) q = q.eq('is_visible', true)
  const { data } = await q.maybeSingle()
  return data
}

export async function tieneProducto(db, profileId, productId) {
  const { data } = await db.from('product_purchases').select('id').eq('profile_id', profileId).eq('product_id', productId).maybeSingle()
  return !!data
}

export const pesoArchivo = (b) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
