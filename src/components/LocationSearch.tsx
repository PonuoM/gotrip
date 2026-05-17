'use client'

import { useEffect, useRef, useState } from 'react'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type?: string
  addresstype?: string
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

export function LocationSearch({
  value, onPick, onChange, placeholder, className, disabled, lang = 'en',
}: Props) {
  const [results, setResults] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const lastQuery = useRef('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    const q = value.trim()
    if (q.length < 3) {
      setResults([])
      return
    }
    if (q === lastQuery.current) return

    timer.current = window.setTimeout(async () => {
      lastQuery.current = q
      setLoading(true)
      try {
        const url = `${NOMINATIM}?format=json&limit=6&addressdetails=0&accept-language=${lang}&q=${encodeURIComponent(q)}`
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
        })
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

    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [value, lang])

  const pick = (r: NominatimResult) => {
    const shortName = r.display_name.split(',').slice(0, 2).join(',').trim()
    onPick({
      name: shortName,
      lat: Number(r.lat),
      lng: Number(r.lon),
    })
    setOpen(false)
    setResults([])
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
          ...
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border-2 border-brand-black rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map(r => {
            const parts = r.display_name.split(',').map(s => s.trim())
            const headline = parts.slice(0, 2).join(', ')
            const sub = parts.slice(2).join(', ')
            return (
              <button
                key={r.place_id}
                type="button"
                onClick={() => pick(r)}
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
