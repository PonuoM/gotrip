'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/components/LangProvider'
import { AvatarBadge, AVATAR_ANIMALS, AVATAR_LABELS, AVATAR_COLORS, DEFAULT_BG, type AvatarAnimal } from '@/components/AvatarBadge'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useT()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [lang, setLang] = useState<'th' | 'en'>('th')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [bgColor, setBgColor] = useState<string>(DEFAULT_BG)
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
        .select('display_name, preferred_lang, avatar_animal, avatar_bg_color')
        .eq('id', user.id)
        .single()

      const current = profile?.display_name || ''
      setName(current)
      setOriginalName(current)
      setLang((profile?.preferred_lang === 'en' ? 'en' : 'th'))
      setAvatar(profile?.avatar_animal || null)
      setBgColor(profile?.avatar_bg_color || DEFAULT_BG)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const pickAvatar = async (animal: AvatarAnimal) => {
    setAvatar(animal)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_profiles').update({ avatar_animal: animal }).eq('id', user.id)
    router.refresh()
  }

  const pickColor = async (color: string) => {
    setBgColor(color)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_profiles').update({ avatar_bg_color: color }).eq('id', user.id)
    router.refresh()
  }

  const changeLang = async (next: 'th' | 'en') => {
    if (next === lang) return
    setLang(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('user_profiles')
      .update({ preferred_lang: next })
      .eq('id', user.id)
    router.refresh()
  }

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
        <div className="text-xs font-bold tracking-[2px] text-gray-500">{t('onb.loading')}</div>
      </main>
    )
  }

  const dirty = name.trim() !== originalName

  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6">

        <div className="mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-gray-600">
            {t('set.kicker')}
          </div>
          <h1 className="mt-1 text-display font-black tracking-tighter text-[44px] leading-none">
            {t('set.heading')}
          </h1>
          <div className="brand-underline" />
        </div>

        {/* Profile card */}
        <div className="flex items-center gap-4 mb-6">
          <AvatarBadge animal={avatar} bgColor={bgColor} fallbackLetter={name[0]} size="lg" />
          <div className="flex-1">
            <div className="font-black text-lg leading-tight">{name.toUpperCase()}</div>
            <div className="text-xs text-gray-500 font-medium truncate">{email}</div>
          </div>
        </div>

        {/* Avatar picker */}
        <div className="card-base p-4 mb-6 space-y-3">
          <div className="text-[10px] font-black tracking-[2px] text-gray-600">
            {lang === 'th' ? 'อวตาร' : 'AVATAR'}
          </div>

          {/* Animal row */}
          <div>
            <div className="text-[9px] font-bold tracking-wider text-gray-500 mb-1.5">
              {lang === 'th' ? 'สัตว์' : 'ANIMAL'}
            </div>
            <div className="flex flex-wrap gap-2">
              {AVATAR_ANIMALS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => pickAvatar(a)}
                  className={`p-1 rounded-full border-2 transition ${
                    avatar === a ? 'border-brand-black scale-110' : 'border-transparent'
                  }`}
                  title={AVATAR_LABELS[a][lang]}
                >
                  <AvatarBadge animal={a} bgColor={bgColor} size="md" />
                </button>
              ))}
            </div>
          </div>

          {/* Color row */}
          <div>
            <div className="text-[9px] font-bold tracking-wider text-gray-500 mb-1.5">
              {lang === 'th' ? 'สีพื้นหลัง' : 'COLOR'}
            </div>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pickColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    bgColor === c ? 'border-brand-black scale-110' : 'border-white'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Edit name */}
        <form onSubmit={handleSave} className="space-y-3">
          <label className="block">
            <div className="text-[10px] font-black tracking-[2px] text-gray-600 mb-1.5">
              {t('set.display')}
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
            {saving ? t('set.saving') : t('set.save_changes')}
          </button>
        </form>

        {/* Divider */}
        <div className="my-8 border-t-2 border-dashed border-gray-200" />

        {/* Language */}
        <div className="mb-8">
          <div className="text-[10px] font-black tracking-[2px] text-gray-600 mb-2">
            LANGUAGE / ภาษา
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeLang('th')}
              className={`py-3 px-4 rounded-pill border-2 border-brand-black font-black text-sm tracking-wider transition ${
                lang === 'th'
                  ? 'bg-brand-black text-white'
                  : 'bg-white text-brand-black hover:bg-gray-50'
              }`}
            >
              🇹🇭 ไทย
            </button>
            <button
              type="button"
              onClick={() => changeLang('en')}
              className={`py-3 px-4 rounded-pill border-2 border-brand-black font-black text-sm tracking-wider transition ${
                lang === 'en'
                  ? 'bg-brand-black text-white'
                  : 'bg-white text-brand-black hover:bg-gray-50'
              }`}
            >
              🇬🇧 ENGLISH
            </button>
          </div>
        </div>

        {/* Logout */}
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="btn-secondary w-full text-brand-red border-brand-red"
          >
            {t('btn.signout')}
          </button>
        </form>

        {/* Version/footer */}
        <div className="mt-10 text-center text-[10px] font-medium text-gray-400 tracking-wider">
          GOTRIP · v0.1 · BUILT WITH ★
        </div>

      </div>
    </main>
  )
}
