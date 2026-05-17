'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from './LangProvider'
import type { TKey } from '@/lib/i18n'

const items: Array<{ href: string; key: TKey; icon: string }> = [
  { href: '/',         key: 'nav.home', icon: '★' },
  { href: '/trips',    key: 'nav.plan', icon: '✈' },
  { href: '/expenses', key: 'nav.pay',  icon: '฿' },
  { href: '/settings', key: 'nav.crew', icon: '◉' },
]

export function BottomNav() {
  const pathname = usePathname()
  const t = useT()
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
            className={`no-underline ${active ? 'text-brand-red' : 'text-white opacity-60 hover:opacity-100 transition'}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{t(item.key)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
