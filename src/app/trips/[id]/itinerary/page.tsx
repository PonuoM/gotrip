import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ItineraryClient } from './client'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function ItineraryPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/itinerary`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, start_date, end_date, default_currency, owner_id')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  // Bounce pending users back to the trip waiting screen
  const { data: myMembership } = await supabase
    .from('trip_members')
    .select('status, role')
    .eq('trip_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership || myMembership.status !== 'approved') {
    redirect(`/trips/${params.id}`)
  }

  const canEdit = myMembership.role === 'owner' || myMembership.role === 'editor'

  const [{ data: activities }, { data: types }] = await Promise.all([
    supabase
      .from('activities')
      .select('id, type_id, title, description, day_number, start_at, end_at, location_name, latitude, longitude, cost_amount, cost_currency, status, sort_order')
      .eq('trip_id', params.id)
      .order('day_number', { ascending: true, nullsFirst: false })
      .order('start_at', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true }),
    supabase
      .from('activity_types')
      .select('id, label_en, label_th, icon, color')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  // Compute trip length in days
  const start = new Date(trip.start_date)
  const end = new Date(trip.end_date)
  const tripDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)

  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6">

        <div className="flex justify-between items-center">
          <Link href={`/trips/${params.id}`} className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
            ← {trip.name.toUpperCase()}
          </Link>
          <Link
            href={`/trips/${params.id}/map`}
            className="text-xs font-bold tracking-[2px] text-brand-red no-underline"
          >
            🗺 {lang === 'th' ? 'แผนที่' : 'MAP'} →
          </Link>
        </div>

        <div className="mt-4 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            ✈ {tripDays} {lang === 'th' ? 'วัน' : 'DAYS'} · ★ ★ ★
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {t(lang, 'page.itinerary')}
          </h1>
          <div className="brand-underline" />
        </div>

        <ItineraryClient
          tripId={params.id}
          tripStart={trip.start_date}
          tripDays={tripDays}
          currency={trip.default_currency}
          canEdit={canEdit}
          activities={activities || []}
          types={types || []}
          lang={lang}
        />
      </div>
    </main>
  )
}
