import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { SpendingPodium } from '@/components/SpendingPodium'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function TripSpendingPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/spending`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, default_currency')
    .eq('id', params.id)
    .single()
  if (!trip) notFound()

  const { data: myMembership } = await supabase
    .from('trip_members')
    .select('id, status')
    .eq('trip_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!myMembership || myMembership.status !== 'approved') {
    redirect(`/trips/${params.id}`)
  }

  const [
    { data: rawMembers },
    { data: allSplits },
  ] = await Promise.all([
    supabase
      .from('trip_members')
      .select('id, user_id, status')
      .eq('trip_id', params.id)
      .eq('status', 'approved'),
    supabase
      .from('expense_splits')
      .select('member_id, share_amount, expenses!inner(trip_id)')
      .eq('expenses.trip_id', params.id)
      .not('member_id', 'is', null),
  ])

  const userIds = (rawMembers || []).map((m: any) => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_animal, avatar_bg_color')
        .in('id', userIds)
    : { data: [] as any[] }
  const profilesById = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))

  const spendByMember = new Map<string, number>()
  for (const s of (allSplits || []) as any[]) {
    if (!s.member_id) continue
    spendByMember.set(s.member_id, (spendByMember.get(s.member_id) || 0) + Number(s.share_amount))
  }

  const tripTotal = Array.from(spendByMember.values()).reduce((a, b) => a + b, 0)

  const podiumRows = (rawMembers || [])
    .map((m: any) => {
      const profile = profilesById[m.user_id]
      return {
        memberId: m.id,
        name: profile?.display_name || '?',
        animal: profile?.avatar_animal,
        bgColor: profile?.avatar_bg_color,
        total: spendByMember.get(m.id) || 0,
      }
    })
    .filter((r: any) => r.total > 0)
    .sort((a: any, b: any) => b.total - a.total)

  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6">

        <Link href={`/trips/${params.id}`} className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
          ← {trip.name.toUpperCase()}
        </Link>

        <div className="mt-4 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            {lang === 'th' ? '🏆 อันดับเจ้าบุญทุ่ม' : '🏆 SPENDING LEADERBOARD'}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {lang === 'th' ? 'ยอดใช้จ่าย' : 'SPENDING.'}
          </h1>
          <div className="brand-underline" />
        </div>

        {/* Total trip spend */}
        <div className="card-hero">
          <div className="text-[10px] font-black tracking-[2px] opacity-80">
            {lang === 'th' ? 'ยอดรวมทั้งทริป' : 'TRIP TOTAL'}
          </div>
          <div className="mt-1 text-[36px] font-black leading-none tracking-tighter">
            {formatCurrency(tripTotal, trip.default_currency)}
          </div>
          <div className="text-xs font-medium mt-1 opacity-80">
            {lang === 'th'
              ? `${podiumRows.length} คน · หาร + ส่วนตัว`
              : `${podiumRows.length} people · shared + personal`}
          </div>
        </div>

        {podiumRows.length === 0 ? (
          <div className="mt-6 text-center py-12 text-gray-400 text-sm font-bold">
            {lang === 'th' ? 'ยังไม่มีค่าใช้จ่าย' : 'No expenses yet'}
          </div>
        ) : (
          <SpendingPodium
            tripId={trip.id}
            rows={podiumRows}
            currency={trip.default_currency}
            lang={lang}
            myMemberId={myMembership.id}
          />
        )}
      </div>
    </main>
  )
}
