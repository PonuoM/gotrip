'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'

export interface MapActivity {
  id: string
  title: string
  day_number: number | null
  start_at: string | null
  location_name: string | null
  latitude: number
  longitude: number
  status: string
  type_id?: string | null
  type_icon?: string
}

export interface CrewLive {
  member_id: string
  user_id: string
  name: string
  lat: number
  lng: number
  updated_at: string
  is_me: boolean
}

export interface ActivityTypeChip {
  id: string
  icon: string
  label: string
}

interface Props {
  tripId: string
  activities: MapActivity[]
  crewLive?: CrewLive[]
  myMemberId?: string
  lang?: 'th' | 'en'
  types?: ActivityTypeChip[]
}

const DAY_COLORS = [
  '#E63946','#185FA5','#0F6E56','#993556','#534AB7','#993C1D','#444441','#888780',
]
const dayColor = (day: number | null) =>
  day ? DAY_COLORS[(day - 1) % DAY_COLORS.length] : '#888780'

function buildActivityIcon(day: number | null, icon: string) {
  const color = dayColor(day)
  const html = `
    <div style="
      width: 32px; height: 32px;
      background: ${color};
      border: 2px solid #1A1A1A;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
    ">
      <div style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${icon}</div>
    </div>
  `
  return L.divIcon({
    html, className: '',
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28],
  })
}

function buildLiveIcon(initial: string, isMe: boolean) {
  const bg = isMe ? '#185FA5' : '#1A1A1A'
  const ring = isMe ? '#74B9FF' : '#FFC107'
  const html = `
    <div class="live-pulse-wrap" style="position:relative;width:40px;height:40px;">
      <div class="live-pulse" style="
        position:absolute; inset:0; border-radius:50%;
        background:${ring}; opacity:0.55;
      "></div>
      <div style="
        position:absolute; inset:6px;
        background:${bg}; border:3px solid #fff; border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        color:#fff; font-weight:900; font-size:13px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
      ">${initial}</div>
    </div>
  `
  return L.divIcon({
    html, className: '',
    iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20],
  })
}

// FitBounds runs only when its `fitKey` changes — not on every parent rerender.
function FitBounds({
  activities, fitKey,
}: { activities: MapActivity[]; fitKey: string }) {
  const map = useMap()
  const lastFit = useRef<string | null>(null)
  useEffect(() => {
    if (lastFit.current === fitKey) return
    lastFit.current = fitKey
    if (activities.length === 0) return
    const lats = activities.map(a => a.latitude).sort((a, b) => a - b)
    const lngs = activities.map(a => a.longitude).sort((a, b) => a - b)
    const median = (xs: number[]) => xs[Math.floor(xs.length / 2)]
    const mLat = median(lats), mLng = median(lngs)
    const madLat = median(lats.map(x => Math.abs(x - mLat)).sort((a, b) => a - b)) || 0.05
    const madLng = median(lngs.map(x => Math.abs(x - mLng)).sort((a, b) => a - b)) || 0.05
    const core = activities.filter(
      a => Math.abs(a.latitude - mLat) <= madLat * 6 &&
           Math.abs(a.longitude - mLng) <= madLng * 6
    )
    const pinsForFit = core.length >= 2 ? core : activities
    const bounds = L.latLngBounds(pinsForFit.map(a => [a.latitude, a.longitude] as [number, number]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [fitKey, activities, map])
  return null
}

export default function TripMap({
  tripId, activities, crewLive: initialCrew = [], myMemberId, lang = 'en', types = [],
}: Props) {
  const supabase = createClient()

  // ===== Pins =====
  const allPinned = useMemo(
    () => activities.filter(a => a.latitude != null && a.longitude != null),
    [activities]
  )
  const allDays = useMemo(
    () => Array.from(new Set(allPinned.map(p => p.day_number).filter((d): d is number => !!d))).sort((a, b) => a - b),
    [allPinned]
  )

  // ===== Filters =====
  const [activeDays,  setActiveDays]  = useState<Set<number>>(new Set())
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)

  const pinned = useMemo(() => allPinned.filter(p => {
    if (activeDays.size > 0 && (!p.day_number || !activeDays.has(p.day_number))) return false
    if (activeTypes.size > 0 && (!p.type_id || !activeTypes.has(p.type_id))) return false
    return true
  }), [allPinned, activeDays, activeTypes])

  const jittered = useMemo(() => {
    const seen = new Map<string, number>()
    return pinned.map(p => {
      const key = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`
      const n = seen.get(key) ?? 0
      seen.set(key, n + 1)
      if (n === 0) return p
      const angle = (n * 137.5) * Math.PI / 180
      const radius = 0.00012 * Math.ceil(n / 8)
      return { ...p,
        latitude:  p.latitude  + Math.sin(angle) * radius,
        longitude: p.longitude + Math.cos(angle) * radius,
      }
    })
  }, [pinned])

  // fitKey changes only when filter selection changes
  const fitKey = useMemo(
    () => `${Array.from(activeDays).sort().join(',')}|${Array.from(activeTypes).sort().join(',')}`,
    [activeDays, activeTypes]
  )

  const toggleDay  = (d: number) => setActiveDays(prev => {
    const next = new Set(prev); next.has(d) ? next.delete(d) : next.add(d); return next
  })
  const toggleType = (id: string) => setActiveTypes(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const clearAll = () => { setActiveDays(new Set()); setActiveTypes(new Set()) }
  const filterCount = activeDays.size + activeTypes.size

  // ===== Crew live (own client-side polling, no router.refresh) =====
  const [crew, setCrew] = useState<CrewLive[]>(initialCrew)
  useEffect(() => {
    const fetchCrew = async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString()
      const { data: members } = await supabase
        .from('trip_members')
        .select('id, user_id, current_lat, current_lng, current_location_at')
        .eq('trip_id', tripId)
        .eq('status', 'approved')
        .not('current_lat', 'is', null)
        .gt('current_location_at', sixHoursAgo)
      if (!members || members.length === 0) { setCrew([]); return }

      const userIds = members.map((m: any) => m.user_id)
      const { data: profiles } = await supabase
        .from('user_profiles').select('id, display_name').in('id', userIds)
      const nameById = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.display_name]))

      const { data: { user } } = await supabase.auth.getUser()
      const myId = user?.id
      setCrew(members.map((m: any) => ({
        member_id: m.id,
        user_id: m.user_id,
        name: nameById[m.user_id] || '?',
        lat: Number(m.current_lat),
        lng: Number(m.current_lng),
        updated_at: m.current_location_at,
        is_me: m.user_id === myId,
      })))
    }
    const id = setInterval(fetchCrew, 30_000)
    return () => clearInterval(id)
  }, [tripId, supabase])

  // ===== Share my location =====
  const [sharing, setSharing] = useState(false)
  const [myPos, setMyPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [geoError, setGeoError] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef<{ lat: number; lng: number; t: number } | null>(null)

  const pushPosition = async (lat: number, lng: number) => {
    if (!myMemberId) return
    const last = lastSentRef.current
    const now = Date.now()
    if (last && now - last.t < 25_000 &&
        Math.abs(last.lat - lat) < 0.0005 &&
        Math.abs(last.lng - lng) < 0.0005) return
    lastSentRef.current = { lat, lng, t: now }
    await supabase
      .from('trip_members')
      .update({
        current_lat: lat, current_lng: lng,
        current_location_at: new Date().toISOString(),
      })
      .eq('id', myMemberId)
  }

  const startSharing = () => {
    if (!navigator.geolocation) {
      setGeoError(lang === 'th' ? 'เบราว์เซอร์ไม่รองรับ GPS' : 'Geolocation not supported')
      return
    }
    setSharing(true)
    setGeoError('')
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords
        setMyPos({ lat: latitude, lng: longitude, accuracy })
        pushPosition(latitude, longitude)
      },
      err => { setGeoError(err.message); stopSharing() },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    )
  }

  const stopSharing = async () => {
    setSharing(false)
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setMyPos(null)
    lastSentRef.current = null
    if (myMemberId) {
      await supabase
        .from('trip_members')
        .update({ current_lat: null, current_lng: null, current_location_at: null })
        .eq('id', myMemberId)
    }
  }

  useEffect(() => () => {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
  }, [])

  // ===== Render =====
  const center: [number, number] = jittered.length > 0
    ? [Number(jittered[0].latitude), Number(jittered[0].longitude)]
    : [35.6762, 139.6503]

  const otherCrew = crew.filter(c => !c.is_me)
  const ownPin = sharing && myPos ? myPos : null

  const fabBadge = filterCount + (sharing ? 1 : 0)

  return (
    <div className="relative">
      <div className="rounded-2xl overflow-hidden border-2 border-brand-black h-[60vh] min-h-[360px] max-h-[600px]">
        <MapContainer
          center={center}
          zoom={11}
          maxZoom={19}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {jittered.map(a => (
            <Marker
              key={a.id}
              position={[a.latitude, a.longitude]}
              icon={buildActivityIcon(a.day_number, a.type_icon || '📍')}
            >
              <Popup>
                <div className="text-xs font-bold">
                  {a.day_number && (
                    <span
                      className="inline-block text-white px-1.5 py-0.5 rounded mr-1.5 text-[10px]"
                      style={{ backgroundColor: dayColor(a.day_number) }}
                    >
                      DAY {a.day_number}
                    </span>
                  )}
                  {a.title}
                </div>
                {a.location_name && (
                  <div className="text-[11px] text-gray-600 mt-1">{a.location_name}</div>
                )}
                {a.start_at && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {new Date(a.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}
                  </div>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block mt-1.5 text-[11px] font-bold text-brand-red no-underline"
                >
                  Open in Google Maps →
                </a>
              </Popup>
            </Marker>
          ))}

          {ownPin && (
            <>
              <CircleMarker
                center={[ownPin.lat, ownPin.lng]}
                radius={Math.min(40, Math.max(8, ownPin.accuracy / 5))}
                pathOptions={{ color: '#185FA5', fillColor: '#185FA5', fillOpacity: 0.15, weight: 1 }}
              />
              <Marker position={[ownPin.lat, ownPin.lng]} icon={buildLiveIcon('YOU', true)}>
                <Popup>
                  <div className="text-xs font-bold">
                    {lang === 'th' ? '📡 คุณอยู่ตรงนี้' : '📡 You are here'}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    ±{Math.round(ownPin.accuracy)} m
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {otherCrew.map(c => {
            const initial = c.name[0]?.toUpperCase() || '?'
            const age = Math.round((Date.now() - new Date(c.updated_at).getTime()) / 60_000)
            return (
              <Marker key={c.member_id} position={[c.lat, c.lng]} icon={buildLiveIcon(initial, false)}>
                <Popup>
                  <div className="text-xs font-bold">📍 {c.name}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {lang === 'th' ? `อัปเดต ${age} นาทีก่อน` : `${age} min ago`}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="block mt-1.5 text-[11px] font-bold text-brand-red no-underline"
                  >
                    Open in Google Maps →
                  </a>
                </Popup>
              </Marker>
            )
          })}

          {jittered.length > 1 && <FitBounds activities={jittered} fitKey={fitKey} />}
        </MapContainer>

        {/* Floating FAB: filters + share */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="absolute bottom-3 right-3 z-[800] bg-brand-black text-white w-14 h-14 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xl"
          aria-label="Filters & share"
        >
          ⚙
          {fabBadge > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              {fabBadge}
            </span>
          )}
        </button>
      </div>

      {/* Counter under map (subtle) */}
      <div className="mt-2 text-[10px] text-gray-500 font-bold text-center">
        {lang === 'th' ? 'แสดง' : 'Showing'} {jittered.length}/{allPinned.length} {lang === 'th' ? 'จุด' : 'pins'}
        {filterCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-2 text-brand-red"
          >
            {lang === 'th' ? '✗ ล้างตัวกรอง' : '✗ Clear filters'}
          </button>
        )}
      </div>

      {/* ===== Filter / Share bottom-sheet modal ===== */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border-2 border-brand-black p-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black tracking-[2px]">
                ⚙ {lang === 'th' ? 'ตัวกรอง · GPS' : 'FILTERS · GPS'}
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="text-lg font-bold text-gray-500"
              >
                ✗
              </button>
            </div>

            {/* Share toggle */}
            <div className="card-base p-3 mb-4 flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold leading-tight">
                {sharing
                  ? (lang === 'th' ? '📡 กำลังแชร์ตำแหน่ง' : '📡 Sharing your location')
                  : (lang === 'th' ? '📍 แชร์ตำแหน่งกับเพื่อน' : '📍 Share your location')}
                {myPos?.accuracy && (
                  <div className="text-[10px] text-gray-500 font-medium">±{Math.round(myPos.accuracy)} m</div>
                )}
                {geoError && (
                  <div className="text-[10px] text-brand-red font-bold mt-0.5">{geoError}</div>
                )}
              </div>
              <button
                type="button"
                onClick={sharing ? stopSharing : startSharing}
                className={`shrink-0 text-[10px] font-black tracking-wider px-3 py-2 rounded-pill border-2 transition ${
                  sharing
                    ? 'bg-brand-red text-white border-brand-black'
                    : 'bg-brand-black text-white border-brand-black'
                }`}
              >
                {sharing
                  ? (lang === 'th' ? '⏹ หยุด' : '⏹ STOP')
                  : (lang === 'th' ? '▶ เริ่ม' : '▶ START')}
              </button>
            </div>

            {/* Day chips */}
            {allDays.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] font-black tracking-[1.5px] text-gray-600 mb-2">
                  {lang === 'th' ? 'กรองตามวัน' : 'BY DAY'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allDays.map(d => {
                    const on = activeDays.has(d) || activeDays.size === 0
                    const c = dayColor(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`text-[11px] font-black px-2.5 py-1 rounded-pill border-2 ${
                          on ? 'text-white' : 'bg-white text-gray-400 border-gray-200'
                        }`}
                        style={on ? { backgroundColor: c, borderColor: '#1A1A1A' } : undefined}
                      >
                        {lang === 'th' ? `วัน ${d}` : `DAY ${d}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Type chips */}
            {types.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] font-black tracking-[1.5px] text-gray-600 mb-2">
                  {lang === 'th' ? 'กรองตามประเภท' : 'BY TYPE'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {types.map(t => {
                    const on = activeTypes.has(t.id) || activeTypes.size === 0
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleType(t.id)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-pill border-2 ${
                          on
                            ? 'border-brand-black bg-brand-black text-white'
                            : 'border-gray-200 bg-white text-gray-400'
                        }`}
                      >
                        {t.icon} {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={clearAll}
                disabled={filterCount === 0}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                {lang === 'th' ? 'ล้างตัวกรอง' : 'CLEAR'}
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 btn-primary"
              >
                {lang === 'th' ? 'ตกลง' : 'DONE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
