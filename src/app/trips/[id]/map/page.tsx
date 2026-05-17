import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { BottomNav } from '@/components/BottomNav'
import { getLang } from '@/lib/i18n.server'
import { t } from '@/lib/i18n'

// Leaflet uses window — render only on the client
const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false })

export default async function MapPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/map`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  const { data: myMembership } = await supabase
    .from('trip_members')
    .select('status')
    .eq('trip_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership || myMembership.status !== 'approved') {
    redirect(`/trips/${params.id}`)
  }

  const [{ data: activities }, { data: types }] = await Promise.all([
    supabase
      .from('activities')
      .select('id, title, day_number, start_at, location_name, latitude, longitude, status, type_id')
      .eq('trip_id', params.id)
      .order('day_number', { ascending: true, nullsFirst: false })
      .order('start_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('activity_types')
      .select('id, icon')
      .eq('is_active', true),
  ])

  const iconByType = Object.fromEntries((types || []).map((t: any) => [t.id, t.icon]))

  const pinned = (activities || [])
    .filter(a => a.latitude != null && a.longitude != null)
    .map(a => ({
      id: a.id,
      title: a.title,
      day_number: a.day_number,
      start_at: a.start_at,
      location_name: a.location_name,
      latitude: Number(a.latitude),
      longitude: Number(a.longitude),
      status: a.status,
      type_icon: a.type_id ? iconByType[a.type_id] : '📍',
    }))

  const total = (activities || []).length
  const withCoords = pinned.length
  const withoutCoords = total - withCoords

  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6">

        <Link href={`/trips/${params.id}/itinerary`} className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
          ← {lang === 'th' ? 'กำหนดการ' : 'ITINERARY'}
        </Link>

        <div className="mt-4 mb-4">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            🗺 {lang === 'th' ? 'แผนที่ทริป' : 'TRIP MAP'} · ★ ★ ★
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {trip.name.toUpperCase()}.
          </h1>
          <div className="brand-underline" />
        </div>

        {withoutCoords > 0 && (
          <div className="mb-3 text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3">
            {lang === 'th'
              ? `⚠ ${withoutCoords} จาก ${total} กิจกรรมยังไม่มีพิกัด — แก้ใน `
              : `⚠ ${withoutCoords} of ${total} activities have no coordinates yet — edit in `}
            <Link href={`/trips/${params.id}/itinerary`} className="text-brand-red underline">
              {lang === 'th' ? 'กำหนดการ' : 'itinerary'}
            </Link>
          </div>
        )}

        {withCoords === 0 ? (
          <div className="card-base p-8 text-center text-gray-500 text-sm">
            {lang === 'th'
              ? 'ยังไม่มีกิจกรรมที่มีพิกัด เพิ่มสถานที่ผ่านช่องค้นหาในหน้ากำหนดการ'
              : 'No pinned activities yet. Search & pick locations in the itinerary form.'}
          </div>
        ) : (
          <TripMap activities={pinned} />
        )}

        {/* Legend by day */}
        {withCoords > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
            {Array.from(new Set(pinned.map(p => p.day_number).filter((d): d is number => !!d)))
              .sort((a, b) => a - b)
              .map(day => {
                const colors = ['#E63946','#185FA5','#0F6E56','#993556','#534AB7','#993C1D','#444441','#888780']
                const color = colors[(day - 1) % colors.length]
                return (
                  <div key={day} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: color }} />
                    <span>{lang === 'th' ? `วัน ${day}` : `DAY ${day}`}</span>
                  </div>
                )
              })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
