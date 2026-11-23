import 'server-only'

// Ajustes generales guardados en app.settings.
export async function ajustes(db, claves) {
  const { data } = await db.from('settings').select('key, value').in('key', claves)
  return Object.fromEntries(claves.map((k) => [k, (data || []).find((x) => x.key === k)?.value ?? null]))
}

// Fecha antes de la cual una cuota pendiente ya pausa el acceso (vencimiento + días de tolerancia).
export async function limitePausa(db, hoyIso) {
  const { dias_tolerancia } = await ajustes(db, ['dias_tolerancia'])
  const dias = Number.isFinite(Number(dias_tolerancia)) ? Number(dias_tolerancia) : 3
  const [y, m, d] = hoyIso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - dias)).toISOString().slice(0, 10)
}
