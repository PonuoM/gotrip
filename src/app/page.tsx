// ==========================================================================
// Home Dashboard · Logged-in user sees their trips
// ==========================================================================
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { daysUntil, formatDate } from '@/lib/utils'
import { BottomNav } from '@/components/BottomNav'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function HomePage() {
  const supabase = createClient()
  const lang = await getLang()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Get trips the user is in (approved only — pending requests show up in /trips/[id])
  const { data: trips } = await supabase
    .from('trip_members')
    .select(`
      role,
      trips (id, name, destination, start_date, end_date, status, cover_url)
    `)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .order('joined_at', { ascending: false })

  const allTrips = (trips || []).map((m: any) => m.trips).filter(Boolean)
  const activeTrip = allTrips.find((t: any) => {
    const days = daysUntil(t.start_date)
    return days >= 0 && t.status !== 'archived'
  })
  const otherTrips = allTrips.filter((t: any) => t.id !== activeTrip?.id)

  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
              {t(lang, 'home.greet')}
            </div>
            <h1 className="mt-1 text-display font-black tracking-tighter">
              {(profile?.display_name || 'YOU').split(' ')[0].toUpperCase()}.
            </h1>
            <div className="brand-underline" />
          </div>
          <div className="flex items-center gap-2">
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                title="Sign out"
                className="text-[10px] font-black tracking-[2px] text-gray-500
                           border-2 border-gray-300 rounded-pill px-3 py-1.5
                           hover:border-brand-red hover:text-brand-red transition"
              >
                OUT →
              </button>
            </form>
            <div className="w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center font-black">
              {profile?.display_name?.[0] || 'U'}
            </div>
          </div>
        </div>

        {/* Active trip card */}
        {activeTrip && (
          <Link href={`/trips/${activeTrip.id}`} className="block mt-6 no-underline">
            <div className="card-hero">
              <div className="flex justify-between items-start">
                <span className="bg-brand-black px-2.5 py-1 rounded-pill text-[10px] font-black tracking-wider">
                  {t(lang, 'home.next_up')}
                </span>
                <span className="font-black text-lg">
                  {lang === 'th' ? `อีก ${daysUntil(activeTrip.start_date)} วัน` : `${daysUntil(activeTrip.start_date)}d`}
                </span>
              </div>

              <div className="mt-4 text-[38px] font-black leading-none tracking-tighter">
                {activeTrip.name.toUpperCase()}.
              </div>
              <div className="text-sm font-medium mt-1">
                {activeTrip.destination}
              </div>

              <div className="mt-4 pt-3 border-t-2 border-dashed border-white flex justify-between text-xs font-bold">
                <span>{formatDate(activeTrip.start_date)}</span>
                <span>━━━━━━</span>
                <span>{formatDate(activeTrip.end_date)}</span>
              </div>
            </div>
          </Link>
        )}

        {/* Other trips */}
        <div className="mt-8 flex justify-between items-baseline">
          <div className="text-xs font-black uppercase tracking-[2px]">
            {t(lang, 'home.more_trips')}
          </div>
          <Link href="/trips" className="text-xs font-medium text-brand-red no-underline">
            {t(lang, 'home.see_all')}
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          {otherTrips.length === 0 && !activeTrip && (
            <div className="text-center py-8 text-gray-500 text-sm">
              {t(lang, 'home.no_trips')}
            </div>
          )}

          {otherTrips.map((trip: any, i: number) => (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="block no-underline">
              <div className={`card-base flex justify-between items-center px-3.5 py-2.5 ${
                i % 2 === 0 ? 'rotate-half' : 'rotate-half-neg'
              }`}>
                <div>
                  <div className="font-black text-sm">{trip.name.toUpperCase()}</div>
                  <div className="text-xs font-medium text-gray-600">
                    {formatDate(trip.start_date)}
                  </div>
                </div>
                <div className="text-xl font-black text-brand-red">→</div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-6">
          <Link href="/trips/new" className="btn-primary block text-center no-underline">
            {t(lang, 'home.start_new')}
          </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
