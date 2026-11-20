'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { crearCuenta } from '@/lib/cuentas'
import { enviarAviso } from '@/lib/correo'
import { urlDelSitio } from '@/lib/sitio'

const esCorreo = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)
const t = (fd, k, max = 4000) => String(fd.get(k) || '').trim().slice(0, max)

export async function enviarSolicitud(_prev, formData) {
  const datos = {
    specialty: t(formData, 'specialty', 200),
    bio: t(formData, 'bio'),
    sample_url: t(formData, 'sample_url', 500),
    proposal: t(formData, 'proposal'),
  }
  const valores = Object.fromEntries(['first_name', 'last_name', 'email', 'phone', ...Object.keys(datos)].map((k) => [k, t(formData, k)]))
  if (!datos.specialty || !datos.bio || !datos.proposal) return { error: 'Cuéntanos tu especialidad, tu experiencia y el curso que te gustaría impartir.', valores }
  if (datos.sample_url && !/^https?:\/\//.test(datos.sample_url)) return { error: 'El enlace debe empezar con https://', valores }

  const admin = createAdminClient()
  let { profile } = await getSessionProfile().catch(() => ({ profile: null }))

  if (!profile) {
    const email = valores.email.toLowerCase()
    const password = String(formData.get('password') || '')
    if (!valores.first_name) return { error: 'Escribe tu nombre.', valores }
    if (!esCorreo(email)) return { error: 'Revisa tu correo.', valores }
    if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.', valores }
    const { data: existe } = await admin.from('profiles').select('id').ilike('email', email.replace(/[%_\\]/g, '\\$&')).maybeSingle()
    if (existe) return { error: 'Ya tienes una cuenta con ese correo. Inicia sesión y vuelve a esta página para enviar tu solicitud.', valores, entrar: true }

    const r = await crearCuenta(admin, { email, password, nombre: valores.first_name, apellidos: valores.last_name, telefono: valores.phone })
    if (r.error) return { error: r.error === 'existe' ? 'Ya tienes una cuenta con ese correo. Inicia sesión y vuelve a esta página.' : 'No pudimos crear tu cuenta. Intenta de nuevo.', valores, entrar: r.error === 'existe' }
    const supabase = await createClient()
    await supabase.auth.signInWithPassword({ email, password })
    profile = { id: r.id, first_name: valores.first_name, role: 'student', email }
  }

  if (profile.role === 'teacher' || profile.role === 'admin') return { listo: true, yaDocente: true }
  const { data: pendiente } = await admin.from('teacher_applications').select('id').eq('profile_id', profile.id).eq('status', 'pendiente').maybeSingle()
  if (pendiente) return { listo: true }

  const { error } = await admin.from('teacher_applications').insert({ profile_id: profile.id, ...datos })
  if (error) {
    console.error('enviarSolicitud', error)
    return { error: 'No pudimos guardar tu solicitud. Intenta de nuevo.', valores }
  }
  if (process.env.CORREO_AVISOS_ADMIN) {
    try {
      await enviarAviso({
        para: process.env.CORREO_AVISOS_ADMIN.split(',').map((s) => s.trim()),
        asunto: `Nueva solicitud de docente: ${profile.first_name || ''}`.trim(),
        titulo: 'Alguien quiere enseñar en EAC',
        parrafos: [`${profile.first_name || 'Una persona'} · ${datos.specialty}`, datos.proposal.slice(0, 300)],
        boton: 'Revisar solicitud',
        enlace: `${await urlDelSitio()}/admin/docentes`,
      })
    } catch (e) {
      console.error('Aviso de solicitud', e)
    }
  }
  return { listo: true }
}
