'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mobileLinks = [
  { href: '/dashboard', label: 'Обзор', icon: '🏠' },
  { href: '/bookings', label: 'Записи', icon: '📅' },
  { href: '/clients', label: 'Клиенты', icon: '👥' },
  { href: '/settings', label: 'Настройки', icon: '⚙️' },
  { href: '/billing', label: 'Подписка', icon: '💳' },
]

export default function MobileNav() {
  const pathname = usePathname()
  return (
    <div className="flex items-center justify-around px-2 py-2">
      {mobileLinks.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors ${
            pathname === href
              ? 'text-zinc-900 font-medium'
              : 'text-zinc-400'
          }`}
        >
          <span className="text-lg leading-none">{icon}</span>
          <span>{label}</span>
        </Link>
      ))}
    </div>
  )
}
