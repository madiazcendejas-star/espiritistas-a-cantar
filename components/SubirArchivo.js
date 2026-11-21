'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { prepararSubida } from '@/app/admin/tienda/actions'
import Icon from './Icon'

let cliente
const sb = () => (cliente ||= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
const peso = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

// Sube un archivo directo a Supabase Storage y deja su ruta en campos ocultos del formulario.
export default function SubirArchivo({ bucket, accept, actual, etiqueta }) {
  const [estado, setEstado] = useState({ fase: 'listo' })

  async function elegir(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setEstado({ fase: 'subiendo', nombre: archivo.name })
    try {
      const { path, token, publicUrl } = await prepararSubida(bucket, archivo.name)
      const { error } = await sb().storage.from(bucket).uploadToSignedUrl(path, token, archivo, { contentType: archivo.type || undefined })
      if (error) throw error
      setEstado({ fase: 'hecho', path, publicUrl, nombre: archivo.name, size: archivo.size })
    } catch (err) {
      setEstado({ fase: 'error', mensaje: err?.message || 'No se pudo subir' })
    }
  }

  return (
    <div className="subir">
      <label className="subir-zona">
        <input type="file" accept={accept} onChange={elegir} disabled={estado.fase === 'subiendo'} />
        <Icon name={estado.fase === 'hecho' ? 'check' : 'download'} size={18} />
        <span>
          {estado.fase === 'subiendo' && `Subiendo ${estado.nombre}…`}
          {estado.fase === 'hecho' && `${estado.nombre} (${peso(estado.size)}) listo. Guarda para aplicarlo.`}
          {estado.fase === 'error' && `Error: ${estado.mensaje}. Intenta de nuevo.`}
          {estado.fase === 'listo' && (actual ? `${etiqueta}: ${actual}. Toca para reemplazar.` : `Toca para elegir ${etiqueta.toLowerCase()}.`)}
        </span>
      </label>
      {estado.fase === 'hecho' && bucket === 'ebooks' && (
        <>
          <input type="hidden" name="file_path" value={estado.path} />
          <input type="hidden" name="file_name" value={estado.nombre} />
          <input type="hidden" name="file_size" value={estado.size} />
        </>
      )}
      {estado.fase === 'hecho' && bucket === 'portadas' && <input type="hidden" name="cover_url" value={estado.publicUrl} />}
    </div>
  )
}
