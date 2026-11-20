'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireTeacher, puedeEditarCurso, puedeGestionarGrupo, esAdmin } from '@/lib/docente'
import { audit, nextId, txt, num, nullable } from '@/lib/admin'
import { enviarAviso } from '@/lib/correo'
import { urlDelSitio } from '@/lib/sitio'

const volver = (ruta, msg, tipo = 'ok') => redirect(`${ruta}${ruta.includes('?') ? '&' : '?'}${tipo}=${encodeURIComponent(msg)}`)
const esUrl = (v) => /^https?:\/\/\S+$/.test(v)

// ---------------------------------------------------------------------
// Perfil docente
// ---------------------------------------------------------------------
export async function guardarPerfilDocente(formData) {
  const { profile, db } = await requireTeacher()
  const sample = txt(formData, 'sample_url')
  if (sample && !esUrl(sample)) volver('/docente/perfil', 'El enlace debe empezar con https://', 'error')
  await db.from('teacher_profiles').upsert({
    profile_id: profile.id,
    specialty: nullable(txt(formData, 'specialty')),
    bio: nullable(txt(formData, 'bio')),
    sample_url: nullable(sample),
    payout_info: nullable(txt(formData, 'payout_info')),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' })
  await audit(db, profile, 'perfil_docente', 'profile', profile.id)
  revalidatePath('/docente/perfil')
  volver('/docente/perfil', 'Perfil guardado.')
}

// ---------------------------------------------------------------------
// Cursos propios (marketplace)
// ---------------------------------------------------------------------
const EDITABLE = ['borrador', 'rechazado']

function datosCurso(formData) {
  const cover = txt(formData, 'cover_url')
  return {
    title: txt(formData, 'title'),
    description: nullable(txt(formData, 'description')),
    what_you_learn: nullable(txt(formData, 'what_you_learn')),
    duration_text: nullable(txt(formData, 'duration_text')),
    cover_url: cover && esUrl(cover) ? cover : null,
    modality: nullable(txt(formData, 'modality')),
  }
}

export async function crearCursoDocente(formData) {
  const { profile, db } = await requireTeacher()
  const datos = datosCurso(formData)
  if (!datos.title) volver('/docente/cursos', 'Escribe el nombre del curso.', 'error')
  const id = await nextId(db, 'courses_id_seq')
  await db.from('courses').insert({ id, ...datos, owner_id: profile.id, review_status: 'borrador', is_visible: false })
  await audit(db, profile, 'crear_curso_docente', 'course', id, { title: datos.title })
  volver(`/docente/cursos/${id}`, 'Borrador creado. Ahora agrega al menos un grupo con su fecha y precio, y envíalo a revisión.')
}

export async function guardarCursoDocente(formData) {
  const { profile, db } = await requireTeacher()
  const id = Number(formData.get('id'))
  const ruta = `/docente/cursos/${id}`
  const { data: c } = await db.from('courses').select('owner_id, review_status').eq('id', id).maybeSingle()
  if (!c || (c.owner_id !== profile.id && !esAdmin(profile))) volver('/docente/cursos', 'No puedes editar ese curso.', 'error')
  if (!EDITABLE.includes(c.review_status)) volver(ruta, 'Este curso ya está en revisión o publicado. Para cambiar su ficha, escríbenos.', 'error')
  const datos = datosCurso(formData)
  if (!datos.title) volver(ruta, 'Escribe el nombre del curso.', 'error')
  await db.from('courses').update(datos).eq('id', id)
  await audit(db, profile, 'editar_curso_docente', 'course', id)
  revalidatePath(ruta)
  volver(ruta, 'Cambios guardados.')
}

export async function enviarARevision(formData) {
  const { profile, db } = await requireTeacher()
  const id = Number(formData.get('id'))
  const ruta = `/docente/cursos/${id}`
  const { data: c } = await db.from('courses').select('title, description, owner_id, review_status').eq('id', id).maybeSingle()
  if (!c || c.owner_id !== profile.id) volver('/docente/cursos', 'No puedes enviar ese curso.', 'error')
  if (!EDITABLE.includes(c.review_status)) volver(ruta, 'Este curso ya fue enviado.', 'error')
  if (!c.description) volver(ruta, 'Agrega una descripción antes de enviarlo.', 'error')
  const { data: grupos } = await db.from('course_groups').select('id, price_total').eq('course_id', id)
  if (!grupos?.length) volver(ruta, 'Agrega al menos un grupo con su fecha y precio.', 'error')
  if (!grupos.some((g) => Number(g.price_total) > 0)) volver(ruta, 'Al menos un grupo necesita precio.', 'error')

  await db.from('courses').update({ review_status: 'en_revision', submitted_at: new Date().toISOString() }).eq('id', id)
  await audit(db, profile, 'enviar_revision', 'course', id)
  if (process.env.CORREO_AVISOS_ADMIN) {
    try {
      await enviarAviso({
        para: process.env.CORREO_AVISOS_ADMIN.split(',').map((s) => s.trim()),
        asunto: `Curso para revisar: ${c.title}`,
        titulo: 'Hay un curso nuevo para revisar',
        parrafos: [`${profile.first_name || 'Un docente'} envió «${c.title}» a revisión.`],
        boton: 'Revisar',
        enlace: `${await urlDelSitio()}/admin/cursos/${id}`,
      })
    } catch (e) {
      console.error('Aviso de revisión', e)
    }
  }
  revalidatePath(ruta)
  volver(ruta, 'Enviado a revisión. Te avisaremos por correo cuando lo revisemos.')
}

// Grupos de un curso propio. En cursos ya publicados, los grupos nuevos
// quedan inactivos hasta que administración los activa.
export async function guardarGrupoDocente(formData) {
  const { profile, db } = await requireTeacher()
  const courseId = Number(formData.get('course_id'))
  const idTxt = txt(formData, 'id')
  const ruta = `/docente/cursos/${courseId}`
  if (!(await puedeEditarCurso(db, profile, courseId))) volver('/docente/cursos', 'No puedes editar ese curso.', 'error')
  const { data: c } = await db.from('courses').select('review_status').eq('id', courseId).single()
  const editable = EDITABLE.includes(c.review_status)
  if (idTxt && !editable) volver(ruta, 'Para cambiar un grupo de un curso publicado, escríbenos.', 'error')
  if (c.review_status === 'en_revision') volver(ruta, 'Espera a que revisemos el curso para agregar grupos.', 'error')

  const modalidad = txt(formData, 'modality')
  const datos = {
    course_id: courseId,
    name: txt(formData, 'name'),
    modality: ['en_linea', 'presencial', 'grabado', 'mixto'].includes(modalidad) ? modalidad : 'en_linea',
    starts_on: nullable(txt(formData, 'starts_on')),
    ends_on: nullable(txt(formData, 'ends_on')),
    schedule_text: nullable(txt(formData, 'schedule_text')),
    price_total: num(formData, 'price_total'),
    installments: Math.max(1, Math.min(12, Math.round(num(formData, 'installments') || 1))),
    capacity: num(formData, 'capacity') || null,
    whatsapp_url: nullable(txt(formData, 'whatsapp_url')),
    frequency: 'mensual',
  }
  if (!datos.name) volver(ruta, 'Escribe el nombre del grupo.', 'error')
  if (idTxt) {
    await db.from('course_groups').update(datos).eq('id', Number(idTxt)).eq('course_id', courseId)
  } else {
    const id = await nextId(db, 'course_groups_id_seq')
    await db.from('course_groups').insert({ id, ...datos, status: editable ? 'activo' : 'inactivo' })
  }
  await audit(db, profile, idTxt ? 'editar_grupo_docente' : 'crear_grupo_docente', 'course', courseId, { name: datos.name })
  revalidatePath(ruta)
  volver(ruta, idTxt ? 'Grupo actualizado.' : editable ? 'Grupo agregado.' : 'Grupo agregado. Lo activaremos en el catálogo en cuanto lo revisemos.')
}

export async function eliminarGrupoDocente(formData) {
  const { profile, db } = await requireTeacher()
  const courseId = Number(formData.get('course_id'))
  const id = Number(formData.get('id'))
  const ruta = `/docente/cursos/${courseId}`
  if (!(await puedeEditarCurso(db, profile, courseId))) volver('/docente/cursos', 'No puedes editar ese curso.', 'error')
  const { data: c } = await db.from('courses').select('review_status').eq('id', courseId).single()
  if (!EDITABLE.includes(c.review_status)) volver(ruta, 'Para quitar un grupo de un curso publicado, escríbenos.', 'error')
  const { count } = await db.from('enrollments').select('id', { count: 'exact', head: true }).eq('group_id', id)
  if (count) volver(ruta, 'Ese grupo ya tiene inscripciones.', 'error')
  await db.from('course_groups').delete().eq('id', id).eq('course_id', courseId)
  await audit(db, profile, 'eliminar_grupo_docente', 'group', id)
  revalidatePath(ruta)
  volver(ruta, 'Grupo eliminado.')
}

// ---------------------------------------------------------------------
// Materiales y clases en vivo (cursos propios y grupos asignados)
// ---------------------------------------------------------------------
async function exigirGrupo(formData) {
  const ctx = await requireTeacher()
  const groupId = Number(formData.get('group_id'))
  if (!(await puedeGestionarGrupo(ctx.db, ctx.profile, groupId))) volver('/docente', 'No tienes acceso a ese grupo.', 'error')
  return { ...ctx, groupId, ruta: `/docente/grupos/${groupId}` }
}

export async function agregarRecursoDocente(formData) {
  const { profile, db, groupId, ruta } = await exigirGrupo(formData)
  const title = txt(formData, 'title')
  const url = txt(formData, 'url')
  if (!title || !esUrl(url)) volver(ruta, 'Escribe el título y un enlace válido (https://…).', 'error')
  const id = await nextId(db, 'group_resources_id_seq')
  await db.from('group_resources').insert({ id, group_id: groupId, title, url, kind: formData.get('kind') === 'pdf' ? 'pdf' : 'video' })
  await audit(db, profile, 'agregar_material', 'group_resource', id, { title })
  revalidatePath(ruta)
  volver(ruta, 'Material agregado.')
}

export async function eliminarRecursoDocente(formData) {
  const { profile, db, groupId, ruta } = await exigirGrupo(formData)
  const id = Number(formData.get('id'))
  await db.from('group_resources').delete().eq('id', id).eq('group_id', groupId)
  await audit(db, profile, 'eliminar_material', 'group_resource', id)
  revalidatePath(ruta)
  volver(ruta, 'Material eliminado.')
}

export async function agregarSesionDocente(formData) {
  const { profile, db, groupId, ruta } = await exigirGrupo(formData)
  const fecha = txt(formData, 'fecha')
  const horaTxt = txt(formData, 'hora')
  const title = txt(formData, 'title')
  if (!fecha || !horaTxt || !title) volver(ruta, 'Escribe título, fecha y hora de la sesión.', 'error')
  const startsAt = new Date(`${fecha}T${horaTxt}:00-06:00`).toISOString()
  const { count } = await db.from('live_sessions').select('id', { count: 'exact', head: true }).eq('group_id', groupId)
  const id = await nextId(db, 'live_sessions_id_seq')
  await db.from('live_sessions').insert({ id, group_id: groupId, number: (count || 0) + 1, title, starts_at: startsAt, meet_url: nullable(txt(formData, 'meet_url')) })
  await audit(db, profile, 'agregar_sesion', 'live_session', id, { title, startsAt })
  revalidatePath(ruta)
  volver(ruta, 'Sesión programada.')
}

export async function actualizarSesionDocente(formData) {
  const { profile, db, groupId, ruta } = await exigirGrupo(formData)
  const id = Number(formData.get('id'))
  await db.from('live_sessions').update({
    meet_url: nullable(txt(formData, 'meet_url')),
    recording_url: nullable(txt(formData, 'recording_url')),
  }).eq('id', id).eq('group_id', groupId)
  await audit(db, profile, 'actualizar_sesion', 'live_session', id)
  revalidatePath(ruta)
  volver(ruta, 'Sesión actualizada.')
}

export async function eliminarSesionDocente(formData) {
  const { profile, db, groupId, ruta } = await exigirGrupo(formData)
  const id = Number(formData.get('id'))
  await db.from('live_sessions').delete().eq('id', id).eq('group_id', groupId)
  await audit(db, profile, 'eliminar_sesion', 'live_session', id)
  revalidatePath(ruta)
  volver(ruta, 'Sesión eliminada.')
}
