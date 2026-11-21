'use server'

import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin, audit, txt, num, nullable } from '@/lib/admin'
import { SUPABASE_URL } from '@/lib/supabase/env'

const volver = (ruta, msg, tipo = 'ok') => redirect(`${ruta}${ruta.includes('?') ? '&' : '?'}${tipo}=${encodeURIComponent(msg)}`)

// Prepara una subida directa del navegador a Storage (sin pasar por Vercel,
// así no hay límite de tamaño del servidor).
export async function prepararSubida(bucket, nombre) {
  const { db } = await requireAdmin()
  if (!['ebooks', 'portadas'].includes(bucket)) throw new Error('Bucket no válido')
  const ext = String(nombre || '').toLowerCase().match(/\.(pdf|png|jpe?g|webp)$/)?.[1]
  if (!ext || (bucket === 'ebooks' && ext !== 'pdf') || (bucket === 'portadas' && ext === 'pdf')) throw new Error('Tipo de archivo no permitido')
  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`
  const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path)
  if (error) throw new Error(error.message)
  return {
    path: data.path,
    token: data.token,
    publicUrl: bucket === 'portadas' ? `${SUPABASE_URL}/storage/v1/object/public/portadas/${data.path}` : null,
  }
}

export async function guardarProducto(formData) {
  const { profile: actor, db } = await requireAdmin()
  const idTxt = txt(formData, 'id')
  const kind = txt(formData, 'kind')
  const datos = {
    kind: ['ebook', 'workbook', 'mazo', 'guia'].includes(kind) ? kind : 'ebook',
    title: txt(formData, 'title'),
    subtitle: nullable(txt(formData, 'subtitle')),
    description: nullable(txt(formData, 'description')),
    author: nullable(txt(formData, 'author')),
    pages: num(formData, 'pages') || null,
    price: Math.max(0, num(formData, 'price')),
    cover_url: nullable(txt(formData, 'cover_url')),
    is_visible: formData.get('is_visible') === 'on',
    is_featured: formData.get('is_featured') === 'on',
    updated_at: new Date().toISOString(),
  }
  const archivo = txt(formData, 'file_path')
  if (archivo) {
    datos.file_path = archivo
    datos.file_name = nullable(txt(formData, 'file_name'))
    datos.file_size = num(formData, 'file_size') || null
  }
  const ruta = idTxt ? `/admin/tienda/${idTxt}` : '/admin/tienda/nuevo'
  if (!datos.title) volver(ruta, 'Escribe el título.', 'error')
  if (datos.price > 0 && datos.price < 10) volver(ruta, 'El precio mínimo para cobrar en línea es $10.', 'error')

  let id = Number(idTxt)
  if (id) {
    if (datos.is_visible) {
      const { data: actual } = await db.from('products').select('file_path').eq('id', id).single()
      if (!actual.file_path && !archivo) volver(ruta, 'Sube el PDF antes de publicarlo.', 'error')
    }
    await db.from('products').update(datos).eq('id', id)
  } else {
    if (datos.is_visible && !archivo) volver(ruta, 'Sube el PDF antes de publicarlo.', 'error')
    const { data, error } = await db.from('products').insert(datos).select('id').single()
    if (error) volver(ruta, `No se pudo guardar: ${error.message}`, 'error')
    id = data.id
  }
  await audit(db, actor, idTxt ? 'editar_producto' : 'crear_producto', 'product', id, { title: datos.title })
  revalidatePath('/tienda')
  revalidatePath('/admin/tienda')
  volver(`/admin/tienda/${id}`, datos.is_visible ? 'Guardado y publicado en la tienda.' : 'Guardado (oculto en la tienda).')
}

// Dar acceso sin pago (regalo, pago por transferencia, error).
export async function darAccesoProducto(formData) {
  const { profile: actor, db } = await requireAdmin()
  const id = Number(formData.get('product_id'))
  const ruta = `/admin/tienda/${id}`
  const ident = txt(formData, 'persona')
  const monto = Math.max(0, num(formData, 'amount'))
  if (!ident) volver(ruta, 'Escribe la matrícula, el correo o el teléfono.', 'error')
  const limpio = ident.replace(/[%_,()\\]/g, '')
  const tel = limpio.replace(/\D/g, '').slice(-10)
  let q = db.from('profiles').select('id, first_name, last_name').limit(2)
  q = limpio.includes('@') ? q.ilike('email', limpio) : tel.length === 10 ? q.eq('phone10', tel) : q.ilike('matricula', limpio)
  const { data: personas } = await q
  if (!personas?.length) volver(ruta, 'No encontramos a esa persona.', 'error')
  if (personas.length > 1) volver(ruta, 'Ese teléfono está en varias cuentas: usa la matrícula.', 'error')
  const p = personas[0]
  const { error } = await db.from('product_purchases').insert({ product_id: id, profile_id: p.id, amount: monto, source: monto > 0 ? 'manual' : 'regalo', granted_by: actor.id, method: monto > 0 ? 'transferencia' : null })
  if (error?.code === '23505') volver(ruta, `${p.first_name} ya lo tenía en su biblioteca.`, 'error')
  if (error) volver(ruta, `No se pudo: ${error.message}`, 'error')
  await audit(db, actor, 'dar_acceso_producto', 'product', id, { profile: p.id, monto })
  revalidatePath(ruta)
  volver(ruta, `Listo: ${[p.first_name, p.last_name].filter(Boolean).join(' ')} ya lo tiene en su biblioteca.`)
}
