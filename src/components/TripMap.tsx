'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

interface Props {
  activities: MapActivity[]
}

// Distinct day colors (1..7+)
const DAY_COLORS = [
  '#E63946', // 1 red
  '#185FA5', // 2 blue
  '#0F6E56', // 3 green
  '#993556', // 4 magenta
  '#534AB7', // 5 violet
  '#993C1D', // 6 brown
  '#444441', // 7 dark gray
  '#888780', // 8+ gray
]

function dayColor(day: number | null) {
  if (!day) return '#888780'
  return DAY_COLORS[(day - 1) % DAY_COLORS.length]
}

function buildIcon(day: number | null, icon: string) {
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
    html,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  })
}

function FitBounds({ activities }: { activities: MapActivity[] }) {
  const map = useMap()
  if (activities.length === 0) return null
  const bounds = L.latLngBounds(activities.map(a => [a.latitude, a.longitude] as [number, number]))
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  return null
}

export default function TripMap({ activities }: Props) {
  const pinnedActivities = useMemo(
    () => activities.filter(a => a.latitude != null && a.longitude != null),
    [activities]
  )

  // Default center: Tokyo if no pins
  const center: [number, number] = pinnedActivities.length > 0
    ? [Number(pinnedActivities[0].latitude), Number(pinnedActivities[0].longitude)]
    : [35.6762, 139.6503]

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-brand-black h-[60vh] min-h-[400px]">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinnedActivities.map(a => (
          <Marker
            key={a.id}
            position={[Number(a.latitude), Number(a.longitude)]}
            icon={buildIcon(a.day_number, a.type_icon || '📍')}
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
                  {new Date(a.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
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
        {pinnedActivities.length > 1 && <FitBounds activities={pinnedActivities} />}
      </MapContainer>
    </div>
  )
}
