export const TZ = 'America/Mexico_City'

export const money = (n) =>
  '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })

export const money2 = (n) =>
  '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fechaLarga = (d) =>
  new Date(d).toLocaleDateString('es-MX', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })

export const fechaCorta = (d) =>
  new Date(d).toLocaleDateString('es-MX', { timeZone: TZ, day: 'numeric', month: 'short' })

// Fechas sin hora (columnas date): se formatean sin convertir zona horaria.
export const fechaDia = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
}

export const hora = (d) =>
  new Date(d)
    .toLocaleTimeString('es-MX', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?a\.?\s?m\.?/i, ' AM')
    .replace(/\s?p\.?\s?m\.?/i, ' PM')

export const diaSemana = (d) => {
  const s = new Date(d).toLocaleDateString('es-MX', { timeZone: TZ, weekday: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const diaMes = (d) => {
  const parts = new Intl.DateTimeFormat('es-MX', { timeZone: TZ, day: '2-digit', month: 'short' }).formatToParts(new Date(d))
  return {
    dia: parts.find((p) => p.type === 'day')?.value,
    mes: (parts.find((p) => p.type === 'month')?.value || '').replace('.', '').toUpperCase(),
  }
}

export const hoyMx = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD

export const MODALIDAD = { en_linea: 'En línea', presencial: 'Presencial', grabado: 'Grabado', mixto: 'Mixto' }

// Suma meses a una fecha YYYY-MM-DD sin problemas de zona horaria (31 ene + 1 = 28/29 feb).
export function sumarMeses(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const f = new Date(Date.UTC(y, m - 1 + n, 1))
  const ultimo = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0)).getUTCDate()
  f.setUTCDate(Math.min(d, ultimo))
  return f.toISOString().slice(0, 10)
}

// Monto de cada cuota de un grupo (mismo redondeo que usa administración).
export const montoCuota = (g) => Math.round((Number(g.price_total) / Math.max(1, g.installments || 1)) * 100) / 100

// Colegiaturas recurrentes
export const RECURRENCIA = { semanal: 'semana', quincenal: 'quincena', mensual: 'mes' }
export const RECURRENCIA_NOMBRE = { semanal: 'semanal', quincenal: 'quincenal', mensual: 'mensual' }
