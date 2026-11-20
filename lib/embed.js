// Convierte enlaces de Google Drive, Google Docs, YouTube y Vimeo en una
// dirección que se puede incrustar dentro de la página (iframe).
// Devuelve null si el enlace no se puede incrustar.

const driveFileId = (u) =>
  u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ||
  ((u.pathname === '/open' || u.pathname.startsWith('/uc')) && u.searchParams.get('id')) ||
  null

export function toEmbed(rawUrl) {
  let u
  try {
    u = new URL(String(rawUrl || '').trim())
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '')

  if (host === 'drive.google.com') {
    const id = driveFileId(u)
    if (id) return { provider: 'drive', src: `https://drive.google.com/file/d/${id}/preview` }
    const folder = u.pathname.match(/\/folders\/([\w-]+)/)?.[1]
    if (folder) return { provider: 'drive-folder', src: `https://drive.google.com/embeddedfolderview?id=${folder}#list` }
    return null
  }

  if (host === 'docs.google.com') {
    const m = u.pathname.match(/^\/(document|presentation|spreadsheets|forms)\/d\/([\w-]+)/)
    if (m) {
      const [, tipo, id] = m
      const fin = tipo === 'forms' ? 'viewform?embedded=true' : tipo === 'presentation' ? 'embed' : 'preview'
      return { provider: 'docs', src: `https://docs.google.com/${tipo}/d/${id}/${fin}` }
    }
    return null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    const id =
      (host === 'youtu.be' && u.pathname.slice(1, 12)) ||
      u.searchParams.get('v') ||
      u.pathname.match(/\/(?:embed|live|shorts)\/([\w-]{11})/)?.[1]
    if (id) return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` }
    return null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d{6,})/)?.[1]
    if (id) return { provider: 'vimeo', src: `https://player.vimeo.com/video/${id}?dnt=1` }
    return null
  }

  if (/\.pdf$/i.test(u.pathname)) return { provider: 'pdf', src: u.toString() }
  return null
}

// ¿Se muestra como video (16:9) o como documento (alto)?
export function esVideo(kind, embed) {
  if (embed?.provider === 'youtube' || embed?.provider === 'vimeo') return true
  if (embed?.provider === 'docs' || embed?.provider === 'pdf' || embed?.provider === 'drive-folder') return false
  return kind === 'video'
}
