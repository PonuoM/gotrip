'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Top loading bar that appears as soon as the user clicks a same-origin
 * <Link>/<a>, and disappears once the URL settles. Purely cosmetic — gives
 * an instant cue that something is happening between click and new content.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)

  // Hide once URL settles
  useEffect(() => {
    setVisible(false)
  }, [pathname, searchParams])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === '_blank') return
      if (anchor.hasAttribute('download')) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return

      let url: URL
      try { url = new URL(anchor.href, location.origin) } catch { return }
      if (url.origin !== location.origin) return

      const samePath = url.pathname === pathname &&
                       url.search === (searchParams ? `?${searchParams}` : '')
      if (samePath) return

      setVisible(true)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [pathname, searchParams])

  if (!visible) return null
  return <div className="route-bar" />
}
