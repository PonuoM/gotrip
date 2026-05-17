import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { EditTripClient } from './client'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n.server'

export default async function EditTripPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lang = await getLang()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/trips/${params.id}/edit`)

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, destination, description, start_date, end_date, default_currency, budget_amount, status, owner_id')
    .eq('id', params.id)
    .single()

  if (!trip) notFound()

  if (trip.owner_id !== user.id) {
    redirect(`/trips/${params.id}`)
  }

  return (
    <main className="min-h-screen bg-brand-white p-6 pb-20">
      <div className="max-w-md mx-auto">

        <Link href={`/trips/${params.id}`} className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
          ← {trip.name.toUpperCase()}
        </Link>

        <div className="mt-4 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            {t(lang, 'edit.kicker')}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[40px] leading-none">
            {t(lang, 'edit.heading')}
          </h1>
          <div className="brand-underline" />
        </div>

        <EditTripClient trip={trip} />
      </div>
    </main>
  )
}
