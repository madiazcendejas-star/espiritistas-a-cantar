import 'server-only'

// Ajustes generales guardados en app.settings.
export async function ajustes(db, claves) {
  const { data } = await db.from('settings').select('key, value').in('key', claves)
  return Object.fromEntries(claves.map((k) => [k, (data || []).find((x) => x.key === k)?.value ?? null]))
}
