import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { DocsClient } from './client'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function DocsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/docs`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  const { data: myMembership } = await supabase
    .from('trip_members')
    .select('status, role')
    .eq('trip_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership || myMembership.status !== 'approved') {
    redirect(`/trips/${params.id}`)
  }

  const canEdit = myMembership.role === 'owner' || myMembership.role === 'editor'

  const { data: documents } = await supabase
    .from('documents')
    .select('id, filename, display_name, description, group_id, file_url, file_size, mime_type, category, uploaded_at, uploaded_by')
    .eq('trip_id', params.id)
    .order('group_id', { ascending: true, nullsFirst: false })
    .order('uploaded_at', { ascending: false })

  return (
    <main className="min-h-screen bg-brand-white pb-24">
      <div className="max-w-md mx-auto p-6">

        <Link href={`/trips/${params.id}`} className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
          ← {trip.name.toUpperCase()}
        </Link>

        <div className="mt-4 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            {t(lang, 'docs.kicker')}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {t(lang, 'page.docs')}
          </h1>
          <div className="brand-underline" />
        </div>

        <DocsClient
          tripId={params.id}
          canEdit={canEdit}
          documents={documents || []}
          lang={lang}
        />
      </div>
      <BottomNav />
    </main>
  )
}
