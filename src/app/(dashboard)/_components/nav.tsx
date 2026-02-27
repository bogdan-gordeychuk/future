'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Обзор' },
  { href: '/bookings', label: 'Записи' },
  { href: '/services', label: 'Услуги' },
  { href: '/masters', label: 'Мастера' },
  { href: '/knowledge', label: 'База знаний' },
  { href: '/settings', label: 'Настройки' },
  { href: '/billing', label: 'Подписка' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="flex-1 px-3 py-3 space-y-0.5">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === href
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
