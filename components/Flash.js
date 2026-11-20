import Icon from './Icon'

// Mensaje de confirmación o error que llega en la URL (?ok=… o ?error=…) tras una acción.
export default function Flash({ ok, error }) {
  if (!ok && !error) return null
  return (
    <div className={`notice ${error ? 'danger' : 'info'}`} style={{ marginBottom: 18 }} role="status">
      <Icon name={error ? 'info' : 'check'} />
      <span>{error || ok}</span>
    </div>
  )
}
