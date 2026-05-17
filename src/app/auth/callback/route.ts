// ==========================================================================
// OAuth Callback Handler
// Handles return from Google/LINE/Email Magic Link
// ==========================================================================
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check for pending invite (from earlier link click)
      const pendingInvite = cookies().get('pending_invite')?.value

      if (pendingInvite) {
        cookies().delete('pending_invite')
        return NextResponse.redirect(`${origin}/join/${pendingInvite}`)
      }

      // First-time users: send to onboarding to pick a short display name
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarded')
          .eq('id', user.id)
          .single()

        if (!profile?.onboarded) {
          const onboardingUrl = new URL(`${origin}/onboarding`)
          if (next && next !== '/') onboardingUrl.searchParams.set('next', next)
          return NextResponse.redirect(onboardingUrl)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Fallback: redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
