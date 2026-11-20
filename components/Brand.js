import Link from 'next/link'

export default function Brand({ href = '/' }) {
  return (
    <Link href={href} className="brand" aria-label="EAC Academia, inicio">
      <div className="brand-mark">EAC</div>
      <div>
        <strong>EAC</strong>
        <span>academia</span>
      </div>
    </Link>
  )
}
