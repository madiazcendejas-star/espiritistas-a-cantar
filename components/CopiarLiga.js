'use client'

import { useState } from 'react'
import Icon from './Icon'

// Botones para compartir la liga de pago: copiar o abrir WhatsApp con el mensaje listo.
export default function CopiarLiga({ url, whatsapp }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copia la liga:', url)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" className="secondary sm" onClick={copiar}><Icon name={copiado ? 'check' : 'file'} size={15} /> {copiado ? '¡Copiada!' : 'Copiar liga de pago'}</button>
      {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="secondary sm"><Icon name="message" size={15} /> Enviar por WhatsApp</a>}
    </div>
  )
}
