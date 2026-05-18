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

// Routes where BottomNav should not appear (auth / legal / single-purpose flows).
const HIDE_PREFIXES = ['/login', '/onboarding', '/privacy', '/terms', '/join', '/auth']

export function BottomNav() {
  const pathname = usePathname() || '/'
  const t = useT()

  if (HIDE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  // Determine active index for the sliding indicator. -1 = no active (hide indicator).
  const activeIndex = items.findIndex(item =>
    item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
  )

  const itemPct = 100 / items.length
  const showIndicator = activeIndex >= 0

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] bottom-nav">
      {/* Sliding active indicator — translateX is animated by CSS transition */}
      <span
        aria-hidden
        className="absolute top-0 h-[3px] bg-brand-red rounded-b-pill transition-transform duration-[260ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none"
        style={{
          width: `${itemPct}%`,
          left: 0,
          transform: `translateX(${activeIndex * 100}%)`,
          opacity: showIndicator ? 1 : 0,
        }}
      />
      {items.map((item, i) => {
        const active = i === activeIndex
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
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
