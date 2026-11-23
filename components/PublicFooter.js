import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer className="pub-footer">
      <div className="inner">
        <span>© {new Date().getFullYear()} EAC Academia · Antes Espiritistas a Cantar</span>
        <span style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link href="/cursos">Cursos</Link>
          <Link href="/tienda">Tienda</Link>
          <Link href="/docentes">Enseña en EAC</Link>
          <Link href="/entrar">Iniciar sesión</Link>
        </span>
      </div>
    </footer>
  )
}
