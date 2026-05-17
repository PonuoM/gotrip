import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { ChecklistClient } from './client'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function ChecklistPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/checklist`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  const { data: myMembership } = await supabase
    .from('trip_members')
    .select('id, status, role')
    .eq('trip_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership || myMembership.status !== 'approved') {
    redirect(`/trips/${params.id}`)
  }

  const canEdit = myMembership.role === 'owner' || myMembership.role === 'editor'

  const [{ data: checklists }, { data: members }] = await Promise.all([
    supabase
      .from('checklists')
      .select(`
        id, title, is_shared, created_at,
        checklist_items (id, title, description, member_id, is_done, sort_order)
      `)
      .eq('trip_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('trip_members')
      .select('id, user_id')
      .eq('trip_id', params.id)
      .eq('status', 'approved'),
  ])

  // Hydrate display names separately (no direct FK on trip_members.user_id)
  const memberUserIds = (members || []).map((m: any) => m.user_id)
  const { data: memberProfiles } = memberUserIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, display_name')
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
            {t(lang, 'cl.kicker')}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {t(lang, 'page.checklist')}
          </h1>
          <div className="brand-underline" />
        </div>

        <ChecklistClient
          tripId={params.id}
          canEdit={canEdit}
          checklists={checklists || []}
          members={membersHydrated}
          lang={lang}
        />
      </div>
      <BottomNav />
    </main>
  )
}
