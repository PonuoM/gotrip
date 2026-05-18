import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { MembersClient } from './client'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function MembersPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/members`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, owner_id')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  const isOwner = trip.owner_id === user.id

  const { data: rawMembers } = await supabase
    .from('trip_members')
    .select('id, role, status, user_id, joined_at')
    .eq('trip_id', params.id)
    .order('joined_at', { ascending: true })

  const { data: invites } = isOwner
    ? await supabase
        .from('trip_invites')
        .select('id, code, role, max_uses, used_count, expires_at, created_at')
        .eq('trip_id', params.id)
        .order('created_at', { ascending: false })
    : { data: [] as any[] }

  // Hydrate profiles separately (no direct FK trip_members.user_id → user_profiles)
  const userIds = (rawMembers || []).map((m: any) => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url, avatar_animal, avatar_bg_color')
        .in('id', userIds)
    : { data: [] as any[] }

  const profilesById = Object.fromEntries(
    (profiles || []).map((p: any) => [p.id, p])
  )
  const members = (rawMembers || []).map((m: any) => ({
    ...m,
    user_profiles: profilesById[m.user_id] || null,
  }))

  const approved = members.filter((m: any) => m.status === 'approved')
  const pending  = members.filter((m: any) => m.status === 'pending')

  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6">

        <Link
          href={`/trips/${params.id}`}
          className="text-xs font-bold tracking-[2px] text-gray-500 no-underline"
        >
          ← {trip.name.toUpperCase()}
        </Link>

        <div className="mt-4 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            {t(lang, 'mem.kicker')}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {t(lang, 'mem.heading')}
          </h1>
          <div className="brand-underline" />
        </div>

        <MembersClient
          tripId={params.id}
          isOwner={isOwner}
          currentUserId={user.id}
          approved={approved}
          pending={pending}
          invites={invites || []}
          lang={lang}
        />
      </div>
    </main>
  )
}
