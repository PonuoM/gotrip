// GoTrip service worker
// Strategy: network-first for navigations (so updates ship instantly), cache-first for built static assets.
// Keep it small — Next.js already fingerprints /_next/static so we can cache aggressively without staleness.

const CACHE = 'gotrip-v3'
const PRECACHE = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-icon.png', '/favicon-32.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Never cache auth/API/Supabase-bound traffic — it must always hit the network.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  const isNavigation = req.mode === 'navigate'
  const isStatic = url.pathname.startsWith('/_next/static/') || /\.(?:png|jpe?g|svg|webp|ico|woff2?|css|js)$/i.test(url.pathname)

  if (isStatic) {
    // Cache-first for hashed static assets.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(req, clone))
          }
          return res
        })
      })
    )
    return
  }

  if (isNavigation) {
    // Network-first, fall back to cached / to offline shell.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(req, clone))
          }
          return res
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/')))
    )
  }
})
