// ==========================================================================
// Server-only i18n helpers
// Use in Server Components only — depends on next/headers via Supabase server client.
// ==========================================================================

import { createClient } from '@/lib/supabase/server'
import type { Lang } from './i18n'

export async function getLang(): Promise<Lang> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'th'
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('preferred_lang')
    .eq('id', user.id)
    .single()
  return (profile?.preferred_lang === 'en' ? 'en' : 'th')
}
