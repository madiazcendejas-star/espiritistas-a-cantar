'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSessionProfile } from '@/lib/auth'
import { getGrupoConMaterial } from '@/lib/groupContent'
import { createAdminClient } from '@/lib/supabase/admin'
import { avanceDelGrupo, emitirConstancia } from '@/lib/constancias'

// Marca o desmarca una clase como vista. Al completar todas las grabaciones
// del grupo, se emite la constancia automáticamente.
export async function marcarVista(formData) {
  const groupId = Number(formData.get('group_id'))
  const key = String(formData.get('key') || '')
  const vista = formData.get('vista') === '1'
  const volver = String(formData.get('volver') || '') === 'grupo' ? `/mi-espacio/grupo/${groupId}` : `/mi-espacio/grupo/${groupId}/ver?m=${encodeURIComponent(key)}`

  const { supabase, profile } = await getSessionProfile()
  if (!profile) redirect('/entrar')
  const data = await getGrupoConMaterial(supabase, groupId)
  if (!data || data.pausado || !data.items.some((it) => it.key === key && it.kind === 'video')) redirect(`/mi-espacio/grupo/${groupId}`)

  const db = createAdminClient()
  let nueva = false
  if (vista) {
    await db.from('content_progress').upsert({ profile_id: profile.id, group_id: groupId, item_key: key }, { onConflict: 'profile_id,group_id,item_key', ignoreDuplicates: true })
    const avance = await avanceDelGrupo(db, profile.id, groupId)
    if (avance.completo) {
      try {
        nueva = (await emitirConstancia(db, { profileId: profile.id, groupId, metodo: 'automatica' })).nueva
      } catch (e) {
        console.error('Constancia automática', e)
      }
    }
  } else {
    await db.from('content_progress').delete().eq('profile_id', profile.id).eq('group_id', groupId).eq('item_key', key)
  }
  revalidatePath(`/mi-espacio/grupo/${groupId}`)
  revalidatePath('/mi-espacio/logros')
  redirect(nueva ? `/mi-espacio/grupo/${groupId}?constancia=nueva` : volver)
}
