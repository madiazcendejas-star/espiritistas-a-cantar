'use client'

import { useEffect, useState } from 'react'
import Icon from './Icon'

const TZ = 'America/Mexico_City'
const fmt = (d, o) => new Date(d).toLocaleString('es-MX', { timeZone: TZ, ...o })

// El botón "Unirse" se habilita automáticamente 15 minutos antes (PRD 5.2).
// Se recalcula cada 20 segundos sin recargar la página.
export default function LiveSessionCard({ session, courseTitle, groupName, ahoraServidor, verHref, asistio }) {
  // Arranca con la hora del servidor para que el HTML inicial coincida, luego usa la del dispositivo.
  const [ahora, setAhora] = useState(ahoraServidor)
  useEffect(() => {
    setAhora(Date.now())
    const t = setInterval(() => setAhora(Date.now()), 20000)
    return () => clearInterval(t)
  }, [])

  const inicio = new Date(session.starts_at).getTime()
  const minutos = (inicio - ahora) / 60000
  const abierta = minutos <= 15 && minutos >= -90
  const pasada = minutos < -90

  let falta = ''
  if (minutos > 0 && minutos < 60) falta = `Comienza en ${Math.ceil(minutos)} min`
  else if (minutos >= 60 && minutos < 1440) falta = `Hoy, ${fmt(inicio, { hour: 'numeric', minute: '2-digit' })}`
  else if (minutos >= 1440) {
    const d = Math.round(minutos / 1440)
    falta = `Disponible en ${d} día${d > 1 ? 's' : ''}`
  } else if (abierta) falta = 'En curso'

  const dia = fmt(inicio, { day: '2-digit' })
  const mes = fmt(inicio, { month: 'short' }).replace('.', '').toUpperCase()
  const diaSemana = fmt(inicio, { weekday: 'long' })
  const horaTxt = fmt(inicio, { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <section className={`live-card ${abierta ? 'now' : ''}`}>
      <div className="live-date"><b>{dia}</b><span>{mes}</span></div>
      <div className="live-detail">
        {pasada ? (
          <span className="live-badge muted"><i /> {session.recording_url ? 'GRABACIÓN DISPONIBLE' : 'SESIÓN TERMINADA'}</span>
        ) : (
          <span className={`live-badge ${abierta ? 'pulse' : ''}`}><i /> EN VIVO{abierta && falta ? ` · ${falta.toUpperCase()}` : ''}</span>
        )}
        <h3>{session.title}</h3>
        <p>{courseTitle}{groupName ? ` · ${groupName}` : ''}{pasada && asistio ? <> · <b style={{ color: 'var(--purple)' }}>✓ Asististe</b></> : null}</p>
      </div>
      <div className="live-time">
        <Icon name="calendar" />
        <span><b>{diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, {horaTxt}</b><small>Hora Ciudad de México</small></span>
      </div>
      {pasada ? (
        session.recording_url ? (
          verHref ? (
            <a className="secondary" href={verHref}><Icon name="play" size={18} /> Ver grabación</a>
          ) : (
            <a className="secondary" href={session.recording_url} target="_blank" rel="noopener noreferrer"><Icon name="play" size={18} /> Ver grabación</a>
          )
        ) : (
          <span className="secondary disabled">Sin grabación</span>
        )
      ) : abierta && session.meet_url ? (
        <a className="primary" href={`/mi-espacio/clase/${session.id}`} target="_blank" rel="noopener noreferrer"><Icon name="video" size={18} /> Unirse a la clase en vivo</a>
      ) : abierta ? (
        <span className="secondary disabled">Enlace pendiente</span>
      ) : (
        <span className="secondary disabled" title="Se habilita 15 minutos antes"><Icon name="lock" size={16} /> {falta}</span>
      )}
    </section>
  )
}
