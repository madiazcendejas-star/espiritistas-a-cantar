'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

export default function NavLinks({ items, label = 'Menú principal' }) {
  const pathname = usePathname()
  return (
    <nav aria-label={label}>
      {items.map((it) => {
        const activo = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + '/')
        return (
          <Link key={it.href} href={it.href} className={activo ? 'selected' : ''} aria-current={activo ? 'page' : undefined}>
            <Icon name={it.icon} />
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
