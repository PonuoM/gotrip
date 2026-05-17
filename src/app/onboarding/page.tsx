'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/trips/new'

  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, onboarded')
        .eq('id', user.id)
        .single()

      if (profile?.onboarded) {
        router.replace(next)
        return
      }

      const suggested =
        (profile?.display_name || '').split(' ')[0] ||
        user.email?.split('@')[0] ||
        ''
      setName(suggested.slice(0, 20))
      setLoading(false)
    }
    load()
  }, [supabase, router, next])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 1) {
      setError('Name is required')
      return
    }
    if (trimmed.length > 20) {
      setError('Keep it under 20 characters')
      return
    }

    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ display_name: trimmed, onboarded: true })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    router.replace(next)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-white">
        <div className="text-xs font-bold tracking-[2px] text-gray-500">LOADING...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-white flex flex-col items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[3px] text-gray-600">
            ★ ONE LAST THING
          </div>
          <h1 className="mt-3 font-black tracking-tighter text-[40px] leading-none">
            WHAT SHOULD<br/>WE CALL YOU?
          </h1>
          <div className="brand-underline" />
          <p className="mt-4 text-sm font-medium text-gray-600 leading-relaxed">
            A short nickname your crew will see.<br/>
            You can change it later.
          </p>
        </div>

        <input
          type="text"
          autoFocus
          required
          maxLength={20}
          placeholder="e.g. Tum, Nat, Ploy"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={submitting}
          className="w-full border-2 border-brand-black rounded-xl py-3 px-4
                     font-bold text-lg focus:outline-none focus:ring-2 focus:ring-brand-red"
        />

        <div className="mt-1 text-[10px] font-bold tracking-wider text-gray-500 text-right">
          {name.length}/20
        </div>

        {error && (
          <div className="mt-3 text-sm font-bold p-3 rounded-xl border-2 bg-red-50 border-brand-red text-brand-red">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="btn-primary w-full mt-6 disabled:opacity-50"
        >
          {submitting ? 'SAVING...' : 'CONTINUE →'}
        </button>
      </form>
    </main>
  )
}
