import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { MembersClient } from './client'

export default async function MembersPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/members`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, owner_id')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  const isOwner = trip.owner_id === user.id

  const { data: members } = await supabase
    .from('trip_members')
    .select(`
      id, role, status, user_id, joined_at,
      user_profiles (display_name, avatar_url)
    `)
    .eq('trip_id', params.id)
    .order('joined_at', { ascending: true })

  const { data: invites } = isOwner
    ? await supabase
        .from('trip_invites')
        .select('id, code, role, max_uses, used_count, expires_at, created_at')
        .eq('trip_id', params.id)
        .order('created_at', { ascending: false })
    : { data: [] as any[] }

  const approved = (members || []).filter((m: any) => m.status === 'approved')
  const pending  = (members || []).filter((m: any) => m.status === 'pending')

  return (
    <main className="min-h-screen bg-brand-white pb-24">
      <div className="max-w-md mx-auto p-6">

        <Link
          href={`/trips/${params.id}`}
          className="text-xs font-bold tracking-[2px] text-gray-500 no-underline"
        >
          ← {trip.name.toUpperCase()}
        </Link>

        <div className="mt-4 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            ◉ THE CREW · ★ ★ ★
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            MEMBERS.
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
        />
      </div>
      <BottomNav />
    </main>
  )
}
