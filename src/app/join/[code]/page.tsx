import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { daysUntil, formatDate } from '@/lib/utils'

export default async function JoinPage({ params }: { params: { code: string } }) {
  const { code } = params
  const supabase = createClient()

  // 1. Fetch invite preview via SECURITY DEFINER RPC
  //    (non-members can't read trip_invites directly under RLS)
  const { data: preview, error: inviteError } = await supabase
    .rpc('get_invite_preview', { p_code: code })

  const invite: any = preview
  const ownerProfile = invite?.owner ?? null

  // Error states
  if (inviteError || !invite || !invite.trip) {
    return (
      <ErrorState
        title="LINK NOT FOUND."
        message="The invite link is invalid or has been deleted. Ask the trip owner for a new one."
      />
    )
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <ErrorState
        title="LINK EXPIRED."
        message="This invite link has expired. Ask the trip owner for a new one."
      />
    )
  }

  if (invite.max_uses && invite.used_count >= invite.max_uses) {
    return (
      <ErrorState
        title="TRIP IS FULL."
        message="This invite has reached its usage limit. Ask the trip owner."
      />
    )
  }

  // 2. Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → save code in cookie + show login prompt
  if (!user) {
    cookies().set('pending_invite', code, { maxAge: 3600, path: '/' })
    return <JoinPreview invite={invite} owner={ownerProfile} />
  }

  // 3. Already a member? Redirect to trip — page will show waiting / detail by status
  const { data: existing } = await supabase
    .from('trip_members')
    .select('id, status')
    .eq('trip_id', invite.trip.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect(`/trips/${invite.trip.id}`)
  }

  // 4. Request to join via RPC — creates a pending row
  const { error: acceptError } = await supabase.rpc('accept_invite', {
    p_code: code,
  })

  if (acceptError) {
    return <ErrorState title="ERROR." message={acceptError.message} />
  }

  // 5. Pending — owner must approve
  return <JoinPending invite={invite} owner={ownerProfile} />
}

// ===== UI Components =====

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen bg-brand-white flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-h1 font-black tracking-tighter">{title}</h1>
        <div className="brand-underline mx-auto mt-2" />
        <p className="mt-4 text-sm text-gray-600">{message}</p>
        <Link href="/" className="btn-primary inline-block mt-8 no-underline">
          BACK TO HOME →
        </Link>
      </div>
    </main>
  )
}

function JoinPreview({ invite, owner }: { invite: any; owner: any }) {
  const trip = invite.trip
  const days = daysUntil(trip.start_date)

  return (
    <main className="min-h-screen bg-brand-white p-6">
      <div className="max-w-sm mx-auto pt-8">

        <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-red">
          ★ YOU'VE BEEN INVITED
        </div>
        <h1 className="mt-2 text-[28px] font-black leading-none tracking-tight">
          JOIN THE CREW.
        </h1>
        <div className="brand-underline" />

        {/* Trip preview card */}
        <div className="card-hero mt-6">
          <div className="flex justify-between items-start">
            <span className="bg-brand-black text-white px-2.5 py-1 rounded-pill text-[10px] font-black tracking-wider">
              ★ ACTIVE
            </span>
            {days > 0 && (
              <span className="text-[11px] font-bold">{days}d left</span>
            )}
          </div>

          <div className="mt-3 text-3xl font-black leading-none tracking-tight">
            {trip.name.toUpperCase()}.
          </div>
          <div className="mt-1 text-xs font-medium">
            {trip.destination} · {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
          </div>

          <div className="mt-4 pt-3 border-t-2 border-dashed border-white/70 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-black flex items-center justify-center font-black text-xs">
              {owner?.display_name?.[0] || 'T'}
            </div>
            <div className="text-xs font-medium">
              <strong>{owner?.display_name}</strong> invited you<br />
              <span className="opacity-85 text-[10px]">Role: {invite.role}</span>
            </div>
          </div>
        </div>

        {/* Login buttons */}
        <div className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600 mb-3">
            LOGIN TO ACCEPT
          </div>

          <Link
            href={`/login?redirect=${encodeURIComponent(`/join/${invite.code}`)}`}
            className="btn-primary block text-center no-underline"
          >
            CONTINUE → SIGN IN
          </Link>
        </div>
      </div>
    </main>
  )
}

function JoinPending({ invite, owner }: { invite: any; owner: any }) {
  const trip = invite.trip

  return (
    <main className="min-h-screen bg-brand-white p-6">
      <div className="max-w-sm mx-auto pt-12 text-center">

        <div className="text-5xl">⏳</div>
        <div className="brand-underline mx-auto mt-3" />

        <h1 className="mt-4 text-[32px] font-black leading-none tracking-tight">
          REQUEST SENT.
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Waiting for <strong>{owner?.display_name || 'the owner'}</strong> to approve you.
        </p>

        <div className="bg-brand-black text-white rounded-2xl p-4 mt-6 text-left">
          <div className="text-[9px] font-black tracking-[1.5px] opacity-70">PENDING</div>
          <div className="text-2xl font-black mt-1 tracking-tight">{trip.name}.</div>
          <div className="text-[11px] font-medium mt-1">
            {trip.destination} · starts {formatDate(trip.start_date)}
          </div>
        </div>

        <p className="mt-6 text-[11px] text-gray-500 leading-relaxed">
          Once approved you'll see the full trip — itinerary,<br/>
          expenses, members, everything.
        </p>

        <Link
          href={`/trips/${trip.id}`}
          className="btn-secondary block mt-6 no-underline"
        >
          CHECK STATUS →
        </Link>
      </div>
    </main>
  )
}
