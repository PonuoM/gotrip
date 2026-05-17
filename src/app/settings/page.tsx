'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/BottomNav'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?redirect=/settings')
        return
      }
      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const current = profile?.display_name || ''
      setName(current)
      setOriginalName(current)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setSaving(true)
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: trimmed })
      .eq('id', user.id)

    if (error) {
      setMessage(`✗ ${error.message}`)
    } else {
      setMessage('✓ Saved')
      setOriginalName(trimmed)
      router.refresh()
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-white">
        <div className="text-xs font-bold tracking-[2px] text-gray-500">LOADING...</div>
      </main>
    )
  }

  const dirty = name.trim() !== originalName

  return (
    <main className="min-h-screen bg-brand-white pb-24">
      <div className="max-w-md mx-auto p-6">

        <div className="mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            ◉ YOUR CREW · ★ ★ ★
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            CREW.
          </h1>
          <div className="brand-underline" />
        </div>

        {/* Profile card */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-red text-white flex items-center justify-center font-black text-2xl">
            {name[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <div className="font-black text-lg leading-tight">{name.toUpperCase()}</div>
            <div className="text-xs text-gray-500 font-medium truncate">{email}</div>
          </div>
        </div>

        {/* Edit name */}
        <form onSubmit={handleSave} className="space-y-3">
          <label className="block">
            <div className="text-[10px] font-black tracking-[2px] text-gray-600 mb-1.5">
              DISPLAY NAME
            </div>
            <input
              type="text"
              required
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              className="w-full border-2 border-brand-black rounded-xl py-3 px-4 font-bold text-lg
                         focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
            <div className="mt-1 text-[10px] font-bold tracking-wider text-gray-500 text-right">
              {name.length}/20
            </div>
          </label>

          {message && (
            <div className={`text-sm font-bold p-3 rounded-xl border-2 ${
              message.startsWith('✓')
                ? 'bg-green-50 border-green-600 text-green-700'
                : 'bg-red-50 border-brand-red text-brand-red'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={!dirty || saving || !name.trim()}
            className="btn-primary w-full disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-8 border-t-2 border-dashed border-gray-200" />

        {/* Logout */}
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="btn-secondary w-full text-brand-red border-brand-red"
          >
            SIGN OUT →
          </button>
        </form>

        {/* Version/footer */}
        <div className="mt-10 text-center text-[10px] font-medium text-gray-400 tracking-wider">
          GOTRIP · v0.1 · BUILT WITH ★
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
