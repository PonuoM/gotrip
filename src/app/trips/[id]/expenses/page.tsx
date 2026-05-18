import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ExpensesClient } from './client'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function TripExpensesPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/expenses`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, default_currency, budget_amount, owner_id')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  const { data: myMembership } = await supabase
    .from('trip_members')
    .select('id, status, role, budget_amount')
    .eq('trip_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership || myMembership.status !== 'approved') {
    redirect(`/trips/${params.id}`)
  }

  const canEdit = myMembership.role === 'owner' || myMembership.role === 'editor'

  const [
    { data: expenses },
    { data: members },
    { data: categories },
    { data: debts },
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select(`
        id, description, amount, currency, category_id, paid_by, paid_at, notes, receipt_url,
        expense_splits (id, member_id, slot_label, share_amount, is_settled, settled_proof_url)
      `)
      .eq('trip_id', params.id)
      .order('paid_at', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('trip_members')
      .select('id, role, user_id')
      .eq('trip_id', params.id)
      .eq('status', 'approved'),
    supabase
      .from('expense_categories')
      .select('id, label_en, label_th, icon, color')
      .eq('is_active', true)
      .order('sort_order'),
    supabase.rpc('calculate_trip_debts', { p_trip_id: params.id }),
  ])

  // Hydrate display names separately (no direct FK trip_members.user_id → user_profiles)
  const memberUserIds = (members || []).map((m: any) => m.user_id)
  const { data: memberProfiles } = memberUserIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_animal, avatar_bg_color')
        .in('id', memberUserIds)
    : { data: [] as any[] }
  const profilesById = Object.fromEntries(
    (memberProfiles || []).map((p: any) => [p.id, p])
  )
  const membersHydrated = (members || []).map((m: any) => ({
    ...m,
    user_profiles: profilesById[m.user_id] || null,
  }))

  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6">

        <Link href={`/trips/${params.id}`} className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
          ← {trip.name.toUpperCase()}
        </Link>

        <div className="mt-4 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            {t(lang, 'exp.kicker')}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {t(lang, 'page.expenses')}
          </h1>
          <div className="brand-underline" />
        </div>

        <ExpensesClient
          tripId={params.id}
          currency={trip.default_currency}
          myBudget={myMembership.budget_amount ? Number(myMembership.budget_amount) : null}
          myMemberId={myMembership.id}
          canEdit={canEdit}
          expenses={expenses || []}
          members={membersHydrated}
          categories={categories || []}
          debts={debts || []}
          lang={lang}
        />
      </div>
    </main>
  )
}
