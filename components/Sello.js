// Sello (insignia) de una ruta temática. Gris si aún no se gana.
export default function Sello({ color = '#6e3fc3', titulo = '', ganado = false, size = 92 }) {
  const c = ganado ? color : '#c9c5d1'
  const letras = titulo.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '✦'
  const puntas = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8
    const r = i % 2 ? 42 : 47
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Sello ${titulo}${ganado ? '' : ' (por ganar)'}`}>
      <polygon points={puntas} fill={c} opacity={ganado ? 1 : 0.55} />
      <circle cx="50" cy="50" r="34" fill="#fff" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray={ganado ? '0' : '3 3'} />
      <text x="50" y="57" textAnchor="middle" fontFamily="Quicksand, sans-serif" fontWeight="700" fontSize="22" fill={c}>{letras}</text>
      {ganado && <text x="50" y="74" textAnchor="middle" fontSize="9" fill={c}>✦</text>}
    </svg>
  )
}
