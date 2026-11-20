import Icon from './Icon'
import { toEmbed, esVideo } from '@/lib/embed'

// Muestra un video o documento dentro de la página. Si el enlace no se puede
// incrustar, ofrece abrirlo aparte como último recurso.
export default function MediaEmbed({ url, kind, title }) {
  const embed = toEmbed(url)
  if (!embed) {
    return (
      <div className="card empty-card">
        <Icon name="link" size={28} />
        <b>Este material se abre en otra ventana</b>
        <div style={{ marginTop: 14 }}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="primary sm">Abrir material</a>
        </div>
      </div>
    )
  }
  const video = esVideo(kind, embed)
  return (
    <div className={video ? 'video-embed' : 'doc-embed'}>
      <iframe
        src={embed.src}
        title={title}
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
