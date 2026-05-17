'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export interface MapActivity {
  id: string
  title: string
  day_number: number | null
  start_at: string | null
  location_name: string | null
  latitude: number
  longitude: number
  status: string
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

interface Props {
  activities: MapActivity[]
  crewLive?: CrewLive[]
  myMemberId?: string
  lang?: 'th' | 'en'
}

// Distinct day colors
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
        position:absolute; inset:0;
        border-radius:50%;
        background:${ring};
        opacity:0.55;
      "></div>
      <div style="
        position:absolute; inset:6px;
        background:${bg};
        border:3px solid #fff;
        border-radius:50%;
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

function FitBounds({ activities }: { activities: MapActivity[] }) {
  const map = useMap()
  if (activities.length === 0) return null
  const lats = activities.map(a => a.latitude).sort((a, b) => a - b)
  const lngs = activities.map(a => a.longitude).sort((a, b) => a - b)
  const median = (xs: number[]) => xs[Math.floor(xs.length / 2)]
  const mLat = median(lats)
  const mLng = median(lngs)
  const madLat = median(lats.map(x => Math.abs(x - mLat)).sort((a, b) => a - b)) || 0.05
  const madLng = median(lngs.map(x => Math.abs(x - mLng)).sort((a, b) => a - b)) || 0.05
  const tol = 6
  const core = activities.filter(
    a => Math.abs(a.latitude - mLat) <= madLat * tol &&
         Math.abs(a.longitude - mLng) <= madLng * tol
  )
  const pinsForFit = core.length >= 2 ? core : activities
  const bounds = L.latLngBounds(pinsForFit.map(a => [a.latitude, a.longitude] as [number, number]))
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  return null
}

export default function TripMap({ activities, crewLive = [], myMemberId, lang = 'en' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const pinned = useMemo(() => activities.filter(a => a.latitude != null && a.longitude != null), [activities])

  // ===== Share-my-location state =====
  const [sharing, setSharing] = useState(false)
  const [myPos, setMyPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [geoError, setGeoError] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef<{ lat: number; lng: number; t: number } | null>(null)

  // Push to DB when sharing & moved enough
  const pushPosition = async (lat: number, lng: number) => {
    if (!myMemberId) return
    const last = lastSentRef.current
    const now = Date.now()
    // throttle: every 25 s OR moved > ~50 m (rough)
    if (last && now - last.t < 25_000 &&
        Math.abs(last.lat - lat) < 0.0005 &&
        Math.abs(last.lng - lng) < 0.0005) return
    lastSentRef.current = { lat, lng, t: now }
    await supabase
      .from('trip_members')
      .update({
        current_lat: lat,
        current_lng: lng,
        current_location_at: new Date().toISOString(),
      })
      .eq('id', myMemberId)
    router.refresh()
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
      err => {
        setGeoError(err.message)
        stopSharing()
      },
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
      router.refresh()
    }
  }

  useEffect(() => {
    // Auto-poll crew positions every 30 s while map is open
    const id = setInterval(() => router.refresh(), 30_000)
    return () => {
      clearInterval(id)
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [router])

  const center: [number, number] = pinned.length > 0
    ? [Number(pinned[0].latitude), Number(pinned[0].longitude)]
    : [35.6762, 139.6503]

  // Exclude self from `crewLive` if we're currently sharing (avoid double-pin)
  const otherCrew = crewLive.filter(c => !c.is_me)
  const ownPin = sharing && myPos ? myPos : null

  return (
    <div className="space-y-2">
      {/* Share toggle */}
      <div className="flex items-center justify-between gap-2 card-base p-2.5">
        <div className="text-[11px] font-bold leading-tight">
          {sharing
            ? (lang === 'th' ? '📡 กำลังแชร์ตำแหน่งของคุณ' : '📡 Sharing your live location')
            : (lang === 'th' ? '📍 แชร์ตำแหน่งกับเพื่อนในทริป' : '📍 Share your location with crew')}
          {myPos?.accuracy && (
            <div className="text-[10px] text-gray-500 font-medium">
              ±{Math.round(myPos.accuracy)} m
            </div>
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
              : 'bg-brand-black text-white border-brand-black hover:bg-brand-red'
          }`}
        >
          {sharing
            ? (lang === 'th' ? '⏹ หยุด' : '⏹ STOP')
            : (lang === 'th' ? '▶ เริ่มแชร์' : '▶ START')}
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden border-2 border-brand-black h-[50vh] min-h-[320px] max-h-[520px]">
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

          {/* Activity pins */}
          {pinned.map(a => (
            <Marker
              key={a.id}
              position={[Number(a.latitude), Number(a.longitude)]}
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
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1.5 text-[11px] font-bold text-brand-red no-underline"
                >
                  Open in Google Maps →
                </a>
              </Popup>
            </Marker>
          ))}

          {/* Live: my own position */}
          {ownPin && (
            <>
              <CircleMarker
                center={[ownPin.lat, ownPin.lng]}
                radius={Math.min(40, Math.max(8, ownPin.accuracy / 5))}
                pathOptions={{ color: '#185FA5', fillColor: '#185FA5', fillOpacity: 0.15, weight: 1 }}
              />
              <Marker
                position={[ownPin.lat, ownPin.lng]}
                icon={buildLiveIcon('YOU', true)}
              >
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

          {/* Live: other crew */}
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
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1.5 text-[11px] font-bold text-brand-red no-underline"
                  >
                    Open in Google Maps →
                  </a>
                </Popup>
              </Marker>
            )
          })}

          {pinned.length > 1 && <FitBounds activities={pinned} />}
        </MapContainer>
      </div>
    </div>
  )
}
