import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { daysUntil, formatDate, formatCurrency } from '@/lib/utils'
import { BottomNav } from '@/components/BottomNav'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, destination, description, start_date, end_date, status, default_currency, budget_amount, owner_id')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  // Check viewer's own membership status — pending users get a waiting screen
  const { data: myMembership } = await supabase
    .from('trip_members')
    .select('status')
    .eq('trip_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (myMembership?.status === 'pending') {
    const { data: owner } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', trip.owner_id)
      .single()
    return <WaitingScreen trip={trip} ownerName={owner?.display_name} />
  }

  // Fetch in parallel
  const [
    { data: rawMembers },
    { count: activityCount },
    { data: expenses },
  ] = await Promise.all([
    supabase
      .from('trip_members')
      .select('id, role, status, user_id')
      .eq('trip_id', params.id),
    supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', params.id),
    supabase
      .from('expenses')
      .select('amount')
      .eq('trip_id', params.id),
  ])

  // Hydrate display names — no direct FK from trip_members.user_id to user_profiles
  const userIds = (rawMembers || []).map((m: any) => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)
    : { data: [] as any[] }

  const profilesById = Object.fromEntries(
    (profiles || []).map((p: any) => [p.id, p])
  )
  const members = (rawMembers || []).map((m: any) => ({
    ...m,
    user_profiles: profilesById[m.user_id] || null,
  }))

  const totalSpent = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)
  const days = daysUntil(trip.start_date)
  const tripLength = daysUntil(trip.end_date) - days + 1
  const isOwner = trip.owner_id === user.id
  const approvedMembers = (members || []).filter((m: any) => m.status === 'approved')
  const pendingCount = (members || []).filter((m: any) => m.status === 'pending').length
  const budgetPct = trip.budget_amount && Number(trip.budget_amount) > 0
    ? Math.min(100, (totalSpent / Number(trip.budget_amount)) * 100)
    : 0

  return (
    <main className="min-h-screen bg-brand-white pb-24">
      <div className="max-w-md mx-auto p-6">

        {/* Back + Edit (owner) */}
        <div className="flex justify-between items-center">
          <Link href="/trips" className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
            {t(lang, 'trip.all_trips')}
          </Link>
          {isOwner && (
            <Link
              href={`/trips/${trip.id}/edit`}
              className="text-xs font-bold tracking-[2px] text-brand-red no-underline"
            >
              ✎ {t(lang, 'btn.edit')}
            </Link>
          )}
        </div>

        {/* Hero */}
        <div className="mt-4 card-hero">
          <div className="flex justify-between items-start">
            <span className="bg-brand-black px-2.5 py-1 rounded-pill text-[10px] font-black tracking-wider">
              {t(lang, `status.${trip.status}` as any)} ★
            </span>
            <span className="font-black text-lg">
              {days >= 0
                ? (lang === 'th' ? `อีก ${days} วัน` : `${days}d`)
                : (lang === 'th' ? `ผ่านมา ${Math.abs(days)} วัน` : `${Math.abs(days)}d ago`)}
            </span>
          </div>

          <div className="mt-3 text-[36px] font-black leading-none tracking-tighter break-words">
            {trip.name.toUpperCase()}.
          </div>
          {trip.destination && (
            <div className="text-sm font-medium mt-1">{trip.destination}</div>
          )}

          <div className="mt-4 pt-3 border-t-2 border-dashed border-white flex justify-between text-xs font-bold">
            <span>{formatDate(trip.start_date)}</span>
            <span>━━ {tripLength}d ━━</span>
            <span>{formatDate(trip.end_date)}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <StatCard label={t(lang, 'trip.members')} value={String(approvedMembers.length)} />
          <StatCard label={t(lang, 'trip.plans')} value={String(activityCount || 0)} />
          <StatCard label={t(lang, 'trip.spent')} value={formatCurrency(totalSpent, trip.default_currency)} small />
        </div>

        {/* Budget bar */}
        {trip.budget_amount && Number(trip.budget_amount) > 0 && (
          <div className="mt-4 card-base p-4">
            <div className="flex justify-between text-[10px] font-black tracking-[2px] text-gray-600 mb-2">
              <span>{t(lang, 'trip.budget')}</span>
              <span>{budgetPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-red" style={{ width: `${budgetPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs font-bold">
              <span>{formatCurrency(totalSpent, trip.default_currency)}</span>
              <span className="text-gray-500">
                / {formatCurrency(Number(trip.budget_amount), trip.default_currency)}
              </span>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="mt-8">
          <div className="flex justify-between items-baseline mb-3">
            <div className="text-xs font-black uppercase tracking-[2px]">{t(lang, 'trip.crew')}</div>
            <Link
              href={`/trips/${trip.id}/members`}
              className="text-[10px] font-black tracking-wider text-brand-red no-underline flex items-center gap-1"
            >
              {isOwner && pendingCount > 0 && (
                <span className="bg-brand-red text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingCount} {lang === 'th' ? 'ใหม่' : 'NEW'}
                </span>
              )}
              {t(lang, 'btn.manage')}
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 items-start">
            {approvedMembers.map((m: any) => {
              const name = m.user_profiles?.display_name || '?'
              const initial = name[0]?.toUpperCase() || '?'
              const isOwner = m.role === 'owner'
              return (
                <div key={m.id} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    {isOwner && <CrownBadge />}
                    <div className="w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center font-black text-sm border-2 border-brand-black">
                      {initial}
                    </div>
                  </div>
                  <div className="text-[10px] font-black tracking-wider text-center max-w-[60px] truncate">
                    {name.toUpperCase()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action grid */}
        <div className="mt-8 grid grid-cols-2 gap-2">
          <ActionCard label={t(lang, 'card.itinerary')} sub={t(lang, 'card.itinerary_sub')} href={`/trips/${trip.id}/itinerary`} />
          <ActionCard label={t(lang, 'card.expenses')}  sub={t(lang, 'card.expenses_sub')}  href={`/trips/${trip.id}/expenses`} />
          <ActionCard label={t(lang, 'card.checklist')} sub={t(lang, 'card.checklist_sub')} href={`/trips/${trip.id}/checklist`} />
          <ActionCard label={t(lang, 'card.docs')}      sub={t(lang, 'card.docs_sub')}      href={`/trips/${trip.id}/docs`} />
        </div>

        {/* Description */}
        {trip.description && (
          <div className="mt-8 card-base p-4">
            <div className="text-[10px] font-black tracking-[2px] text-gray-600 mb-2">{t(lang, 'trip.notes')}</div>
            <p className="text-sm whitespace-pre-wrap">{trip.description}</p>
          </div>
        )}

      </div>
      <BottomNav />
    </main>
  )
}

function WaitingScreen({ trip, ownerName }: { trip: any; ownerName?: string }) {
  return (
    <main className="min-h-screen bg-brand-white p-6 pb-24">
      <div className="max-w-sm mx-auto pt-12 text-center">

        <div className="text-5xl">⏳</div>
        <div className="brand-underline mx-auto mt-3" />

        <h1 className="mt-4 text-[32px] font-black leading-none tracking-tight">
          WAITING.
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          <strong>{ownerName || 'The owner'}</strong> hasn't approved you yet.
        </p>

        <div className="bg-brand-black text-white rounded-2xl p-4 mt-6 text-left">
          <div className="text-[9px] font-black tracking-[1.5px] opacity-70">PENDING</div>
          <div className="text-2xl font-black mt-1 tracking-tight">{trip.name}.</div>
          {trip.destination && (
            <div className="text-[11px] font-medium mt-1">{trip.destination}</div>
          )}
        </div>

        <p className="mt-6 text-[11px] text-gray-500 leading-relaxed">
          You'll see itinerary, expenses, and members<br/>
          once the owner approves your request.
        </p>

        <Link href="/" className="btn-secondary block mt-6 no-underline">
          ← BACK TO HOME
        </Link>
      </div>
      <BottomNav />
    </main>
  )
}

function CrownBadge() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      className="absolute -top-2 -left-1.5 z-10 crown-wobble drop-shadow-[1px_1px_0_#1A1A1A]"
      aria-label="owner"
    >
      <defs>
        <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFE176" />
          <stop offset="55%"  stopColor="#F5B500" />
          <stop offset="100%" stopColor="#B47A00" />
        </linearGradient>
        <linearGradient id="crownShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#FFF" stopOpacity="0" />
          <stop offset="50%"  stopColor="#FFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id="crownClip">
          <path d="M3 9.5 L7.5 13 L12 6 L16.5 13 L21 9.5 L19.5 17 H4.5 Z" />
        </clipPath>
      </defs>

      {/* Crown body */}
      <path
        d="M3 9.5 L7.5 13 L12 6 L16.5 13 L21 9.5 L19.5 17 H4.5 Z"
        fill="url(#crownGold)"
        stroke="#1A1A1A"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Gem on top */}
      <circle cx="12" cy="5" r="1.4" fill="#E63946" stroke="#1A1A1A" strokeWidth="0.8" />
      <circle cx="3"  cy="9.5" r="1.1" fill="#5DCAA5" stroke="#1A1A1A" strokeWidth="0.7" />
      <circle cx="21" cy="9.5" r="1.1" fill="#5DCAA5" stroke="#1A1A1A" strokeWidth="0.7" />

      {/* Base band */}
      <rect x="4.5" y="16.5" width="15" height="2" fill="#7A4F00" stroke="#1A1A1A" strokeWidth="0.8" />

      {/* Animated shine sweep */}
      <g clipPath="url(#crownClip)">
        <rect className="crown-shine" x="-8" y="0" width="6" height="24" fill="url(#crownShine)" />
      </g>
    </svg>
  )
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="card-base p-3">
      <div className="text-[9px] font-black tracking-[2px] text-gray-600">{label}</div>
      <div className={`mt-1 font-black tracking-tighter ${small ? 'text-base' : 'text-2xl'}`}>
        {value}
      </div>
    </div>
  )
}

function ActionCard({ label, sub, href, disabled }: { label: string; sub: string; href?: string; disabled?: boolean }) {
  const body = (
    <div className={`card-base p-3.5 h-full ${disabled ? 'opacity-50' : 'hover:border-brand-red transition'}`}>
      <div className="font-black text-sm">{label}</div>
      <div className="text-[10px] text-gray-500 font-bold mt-0.5">{sub}</div>
      {disabled && (
        <div className="mt-2 text-[9px] text-brand-red font-black tracking-wider">
          COMING SOON ★
        </div>
      )}
    </div>
  )
  return href ? <Link href={href} className="no-underline">{body}</Link> : body
}
