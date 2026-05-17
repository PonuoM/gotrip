import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { daysUntil, formatDate } from '@/lib/utils'
import { BottomNav } from '@/components/BottomNav'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function TripsPage() {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/trips')

  const { data: memberships } = await supabase
    .from('trip_members')
    .select(`
      role,
      status,
      joined_at,
      trips (id, name, destination, start_date, end_date, status)
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const trips = (memberships || [])
    .map((m: any) => m.trips ? { ...m.trips, role: m.role, memberStatus: m.status } : null)
    .filter(Boolean)

  const pendingTrips = trips.filter((t: any) => t.memberStatus === 'pending')
  const approvedTrips = trips.filter((t: any) => t.memberStatus === 'approved')
  const upcoming = approvedTrips.filter((t: any) => daysUntil(t.start_date) >= 0 && t.status !== 'archived')
  const past = approvedTrips.filter((t: any) => daysUntil(t.end_date) < 0 || t.status === 'archived')

  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6">

        <div className="mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            {t(lang, 'trips.kicker')}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {t(lang, 'page.plan')}
          </h1>
          <div className="brand-underline" />
        </div>

        <Link href="/trips/new" className="btn-primary block text-center no-underline mb-6">
          {t(lang, 'btn.new_trip')}
        </Link>

        {pendingTrips.length > 0 && (
          <Section
            title={`${t(lang, 'trips.awaiting')} · ${pendingTrips.length}`}
            trips={pendingTrips}
            emptyMsg=""
            pending
            waitingLabel={t(lang, 'trips.waiting')}
          />
        )}
        <Section title={t(lang, 'trips.upcoming')} trips={upcoming} emptyMsg={t(lang, 'trips.no_upcoming')} />
        <Section title={t(lang, 'trips.past')} trips={past} emptyMsg="" />

      </div>

      <BottomNav />
    </main>
  )
}

function Section({ title, trips, emptyMsg, pending, waitingLabel }: {
  title: string; trips: any[]; emptyMsg: string; pending?: boolean; waitingLabel?: string
}) {
  if (trips.length === 0 && !emptyMsg) return null
  return (
    <div className="mt-6">
      <div className={`text-xs font-black uppercase tracking-[2px] mb-3 ${pending ? 'text-brand-red' : ''}`}>
        {title}
      </div>
      {trips.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">{emptyMsg}</div>
      ) : (
        <div className="space-y-2">
          {trips.map((trip, i) => (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="block no-underline">
              <div className={`card-base px-4 py-3 ${pending ? 'border-brand-red' : ''} ${i % 2 === 0 ? 'rotate-half' : 'rotate-half-neg'}`}>
                <div className="flex justify-between items-baseline">
                  <div className="font-black text-base">{trip.name.toUpperCase()}</div>
                  <div className={`text-[10px] font-bold tracking-wider ${pending ? 'text-brand-red' : 'text-gray-500'}`}>
                    {pending ? (waitingLabel || '⏳ WAITING') : trip.role.toUpperCase()}
                  </div>
                </div>
                {trip.destination && (
                  <div className="text-xs font-medium text-gray-600 mt-0.5">{trip.destination}</div>
                )}
                <div className="text-[11px] font-bold text-gray-500 mt-1">
                  {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
