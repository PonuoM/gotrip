'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/',         label: 'HOME', icon: '★' },
  { href: '/trips',    label: 'PLAN', icon: '✈' },
  { href: '/expenses', label: 'PAY',  icon: '฿' },
  { href: '/settings', label: 'CREW', icon: '◉' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bottom-nav">
      {items.map(item => {
        const active = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`no-underline ${active ? 'text-brand-red' : 'text-white opacity-50'}`}
          >
            <span className="mr-1">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
