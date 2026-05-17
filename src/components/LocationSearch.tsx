'use client'

import { useEffect, useRef, useState } from 'react'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface Props {
  value: string
  onPick: (loc: { name: string; lat: number; lng: number }) => void
  onChange: (text: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  lang?: 'th' | 'en'
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

// "34.6, 135.5" or "34.6,135.5" or "34.6  135.5"
const COORD_RE = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

// Google / OSM share URL — minimal sniff
const URL_RE   = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl|(?:www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|osm\.org|www\.openstreetmap\.org)/i

export function LocationSearch({
  value, onPick, onChange, placeholder, className, disabled, lang = 'en',
}: Props) {
  const [results, setResults] = useState<NominatimResult[]>([])
  const [coordHit, setCoordHit] = useState<{ lat: number; lng: number } | null>(null)
  const [urlResolving, setUrlResolving] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const lastQuery = useRef('')
  const timer = useRef<number | undefined>(undefined)

  // ===== Detect input type on every change =====
  useEffect(() => {
    setUrlError('')
    const text = value.trim()

    // 1) Raw coords: instant hit
    const m = text.match(COORD_RE)
    if (m) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setCoordHit({ lat, lng })
        setResults([])
        setOpen(true)
        return
      }
    }
    setCoordHit(null)

    // 2) Google / OSM URL: resolve via our API
    if (URL_RE.test(text)) {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(async () => {
        setUrlResolving(true)
        try {
          const res = await fetch(`/api/resolve-maps?url=${encodeURIComponent(text)}`)
          const data = await res.json()
          if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
          setCoordHit({ lat: Number(data.lat), lng: Number(data.lng) })
          setOpen(true)
        } catch (err: any) {
          setUrlError(err.message || 'failed to resolve link')
        } finally {
          setUrlResolving(false)
        }
      }, 250)
      setResults([])
      return
    }

    // 3) Free-text search via Nominatim (>=3 chars, debounced)
    if (text.length < 3) {
      setResults([])
      return
    }
    if (text === lastQuery.current) return

    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      lastQuery.current = text
      setLoading(true)
      try {
        const url = `${NOMINATIM}?format=json&limit=6&accept-language=${lang}&q=${encodeURIComponent(text)}`
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
        if (!res.ok) throw new Error('search failed')
        const data: NominatimResult[] = await res.json()
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [value, lang])

  const pickResult = (r: NominatimResult) => {
    const shortName = r.display_name.split(',').slice(0, 2).join(',').trim()
    onPick({ name: shortName, lat: Number(r.lat), lng: Number(r.lon) })
    setOpen(false)
    setResults([])
  }

  const pickCoords = () => {
    if (!coordHit) return
    const name = `${coordHit.lat.toFixed(5)}, ${coordHit.lng.toFixed(5)}`
    onPick({ name, lat: coordHit.lat, lng: coordHit.lng })
    setOpen(false)
    setCoordHit(null)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => (results.length > 0 || coordHit) && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />
      {(loading || urlResolving) && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
          ...
        </div>
      )}

      {urlError && (
        <div className="mt-1 text-[10px] font-bold text-brand-red">
          {lang === 'th' ? 'อ่านลิงก์ไม่ออก: ' : 'Could not read link: '}{urlError}
        </div>
      )}

      {open && (coordHit || results.length > 0) && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border-2 border-brand-black rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {/* Direct coords / resolved-URL hit */}
          {coordHit && (
            <button
              type="button"
              onClick={pickCoords}
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 border-b border-gray-100 bg-red-50/40"
            >
              <div className="font-bold text-xs">
                📍 {lang === 'th' ? 'ใช้พิกัดนี้' : 'Use these coordinates'}
              </div>
              <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                {coordHit.lat.toFixed(6)}, {coordHit.lng.toFixed(6)}
              </div>
            </button>
          )}

          {/* Nominatim text results */}
          {results.map(r => {
            const parts = r.display_name.split(',').map(s => s.trim())
            const headline = parts.slice(0, 2).join(', ')
            const sub = parts.slice(2).join(', ')
            return (
              <button
                key={r.place_id}
                type="button"
                onClick={() => pickResult(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="font-bold text-xs truncate">📍 {headline}</div>
                {sub && (
                  <div className="text-[10px] text-gray-500 font-medium truncate">{sub}</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
