import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { BottomNav } from '@/components/BottomNav'
import { getLang, t } from '@/lib/i18n'

export default async function ExpensesPage() {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/expenses')

  // Fetch trips user belongs to, with expense totals via separate query
  const { data: memberships } = await supabase
    .from('trip_members')
    .select(`
      trips (id, name, destination, default_currency, budget_amount, start_date)
    `)
    .eq('user_id', user.id)

  const trips = (memberships || [])
    .map((m: any) => m.trips)
    .filter(Boolean)

  // For each trip, fetch sum of expenses
  const tripIds = trips.map((t: any) => t.id)
  const totals = new Map<string, number>()

  if (tripIds.length > 0) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('trip_id, amount')
      .in('trip_id', tripIds)

    for (const e of expenses || []) {
      totals.set(e.trip_id, (totals.get(e.trip_id) || 0) + Number(e.amount))
    }
  }

  const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0)

  return (
    <main className="min-h-screen bg-brand-white pb-24">
      <div className="max-w-md mx-auto p-6">

        <div className="mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            {t(lang, 'pay.kicker')}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {t(lang, 'page.pay')}
          </h1>
          <div className="brand-underline" />
        </div>

        {/* Grand total card */}
        <div className="card-hero mt-2">
          <div className="text-[10px] font-black tracking-[2px] opacity-80">
            {t(lang, 'pay.total')}
          </div>
          <div className="mt-1 text-[38px] font-black leading-none tracking-tighter">
            {formatCurrency(grandTotal, 'THB')}
          </div>
          <div className="text-xs font-medium mt-1 opacity-80">
            {t(lang, 'pay.across')} {trips.length} {trips.length !== 1 ? t(lang, 'pay.trips') : t(lang, 'pay.trip')}
          </div>
        </div>

        {/* By trip */}
        <div className="mt-8">
          <div className="text-xs font-black uppercase tracking-[2px] mb-3">
            {t(lang, 'pay.by_trip')}
          </div>
          {trips.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {t(lang, 'pay.no_trips')} <Link href="/trips/new" className="underline text-brand-red">{t(lang, 'pay.start_one')}</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((trip: any) => {
                const spent = totals.get(trip.id) || 0
                const budget = Number(trip.budget_amount) || 0
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
                return (
                  <Link key={trip.id} href={`/trips/${trip.id}`} className="block no-underline">
                    <div className="card-base px-4 py-3">
                      <div className="flex justify-between items-baseline">
                        <div className="font-black text-sm">{trip.name.toUpperCase()}</div>
                        <div className="font-black text-sm">
                          {formatCurrency(spent, trip.default_currency)}
                        </div>
                      </div>
                      {budget > 0 && (
                        <>
                          <div className="text-[10px] text-gray-500 mt-1">
                            {t(lang, 'pay.budget_of')} {formatCurrency(budget, trip.default_currency)} · {pct.toFixed(0)}%
                          </div>
                          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-red"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
