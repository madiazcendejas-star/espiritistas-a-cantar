'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { buscarPerfil, correoDeCuenta, esCorreoTecnico } from '@/lib/cuentas'
import { enviarCorreoRecuperacion } from '@/lib/correo'
import { urlDelSitio } from '@/lib/sitio'

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// Siempre responde lo mismo (exista o no la cuenta) para no revelar quién está registrado.
export async function pedirEnlace(_prev, formData) {
  const identificador = String(formData.get('identificador') || '').trim()
  if (!identificador) return { error: 'Escribe tu teléfono, matrícula o correo.' }
  const listo = { enviado: true }
  const inicio = Date.now()

  try {
    const admin = createAdminClient()
    const r = await buscarPerfil(admin, identificador)
    if (r.compartido) return { error: r.error }
    if (r.perfil) {
      const correoAuth = await correoDeCuenta(admin, r.perfil)
      const destino = !esCorreoTecnico(r.perfil.email) ? r.perfil.email : !esCorreoTecnico(correoAuth) ? correoAuth : null

      // Máximo un correo cada 2 minutos por cuenta.
      const hace2min = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const { count } = await admin
        .from('audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'recuperar_contrasena')
        .eq('entity_id', String(r.perfil.id))
        .gte('created_at', hace2min)

      if (destino && correoAuth && !count) {
        const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: correoAuth })
        if (error) throw error
        const enlace = `${await urlDelSitio()}/entrar/restablecer?t=${encodeURIComponent(data.properties.hashed_token)}`
        await enviarCorreoRecuperacion({ para: destino, nombre: r.perfil.first_name, enlace })
        await admin.from('audit_log').insert({ actor_id: null, action: 'recuperar_contrasena', entity: 'profile', entity_id: String(r.perfil.id), detail: null })
      }
    }
  } catch (e) {
    console.error('pedirEnlace', e)
  }
  // Mismo tiempo de respuesta en todos los casos.
  const resto = 1200 - (Date.now() - inicio)
  if (resto > 0) await esperar(resto)
  return listo
}
