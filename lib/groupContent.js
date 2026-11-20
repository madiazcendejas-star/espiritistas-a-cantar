import 'server-only'

// Carga un grupo del estudiante con todo su material en un solo orden:
// manual del curso → lecciones grabadas → recursos del grupo.
// RLS garantiza que solo vea material de grupos con acceso activo.
export async function getGrupoConMaterial(supabase, groupId) {
  const { data: mio } = await supabase
    .from('my_groups')
    .select('group_id, course_id, enrollment_status, access_state')
    .eq('group_id', groupId)
    .maybeSingle()
  if (!mio || mio.enrollment_status !== 'activa') return null

  const [{ data: grupo }, { data: curso }] = await Promise.all([
    supabase.from('course_groups').select('id, name, modality, starts_on, schedule_text, whatsapp_url').eq('id', groupId).maybeSingle(),
    supabase.from('courses').select('id, title, description, manual_pdf_url').eq('id', mio.course_id).maybeSingle(),
  ])
  if (!grupo || !curso) return null

  const pausado = mio.access_state !== 'activo'
  if (pausado) return { mio, grupo, curso, pausado, items: [], sesiones: [] }

  const [r, l, s] = await Promise.all([
    supabase.from('group_resources').select('id, title, kind, url, created_at').eq('group_id', groupId).order('created_at', { ascending: true }).order('id', { ascending: true }),
    supabase.from('lessons').select('id, title, video_url, position').eq('course_id', curso.id).order('position', { ascending: true }),
    supabase.from('live_sessions').select('id, group_id, number, title, starts_at, meet_url, recording_url').eq('group_id', groupId).order('starts_at', { ascending: true }),
  ])

  const items = []
  if (curso.manual_pdf_url) items.push({ key: 'manual', title: 'Manual del curso', kind: 'pdf', url: curso.manual_pdf_url, etiqueta: 'PDF' })
  ;(l.data || []).forEach((x, i) =>
    items.push({ key: `l-${x.id}`, title: `Lección ${i + 1}: ${x.title}`, kind: 'video', url: x.video_url, etiqueta: 'Lección grabada' }),
  )
  ;(r.data || []).forEach((x) =>
    items.push({
      key: `r-${x.id}`,
      title: x.title,
      kind: x.kind === 'pdf' ? 'pdf' : 'video',
      url: x.url,
      etiqueta: x.kind === 'pdf' ? 'PDF' : 'Clase grabada',
    }),
  )
  return { mio, grupo, curso, pausado, items, sesiones: s.data || [] }
}
