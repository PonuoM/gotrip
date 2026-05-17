'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [showEmail, setShowEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  const handleOAuth = async (provider: 'google' | 'line') => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('✓ Check your email for login link!')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-brand-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-10">
          <div className="text-[11px] font-bold uppercase tracking-[3px] text-gray-600">
            ★ HELLO TRAVELER
          </div>
          <h1 className="mt-3 font-black tracking-tighter text-[48px] leading-none">
            TRIPPAL.
          </h1>
          <div className="brand-underline" />
          <p className="mt-4 text-sm font-medium text-gray-600 leading-relaxed">
            Plan trips with your crew.<br/>
            Split costs. Make memories.
          </p>
        </div>

        {/* Login buttons */}
        <div className="space-y-2.5">

          {/* LINE Login — disabled until provider is configured in Supabase */}
          {/* <button
            onClick={() => handleOAuth('line')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5
                       bg-line text-white border-2 border-brand-black rounded-pill
                       py-3.5 font-black text-sm tracking-wider
                       hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          >
            <span className="bg-white text-line w-5 h-5 rounded-full flex items-center justify-center font-black text-xs">
              L
            </span>
            CONTINUE WITH LINE
          </button> */}

          {/* Google Login */}
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5
                       bg-white text-brand-black border-2 border-brand-black rounded-pill
                       py-3.5 font-black text-sm tracking-wider
                       hover:bg-gray-50 active:scale-95 transition disabled:opacity-50"
          >
            <span className="font-black text-base text-[#4285F4]">G</span>
            CONTINUE WITH GOOGLE
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2.5 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <div className="text-[10px] font-bold tracking-[2px] text-gray-500">OR</div>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email form */}
          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              className="btn-dashed w-full"
            >
              USE EMAIL →
            </button>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-2.5">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="w-full border-2 border-brand-black rounded-xl py-3 px-4
                           font-bold focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'SENDING...' : 'SEND MAGIC LINK →'}
              </button>
            </form>
          )}

          {message && (
            <div className={`text-sm font-bold p-3 rounded-xl border-2 ${
              message.startsWith('✓')
                ? 'bg-green-50 border-green-600 text-green-700'
                : 'bg-red-50 border-brand-red text-brand-red'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-[10px] font-medium text-gray-500 leading-relaxed">
          By continuing you agree to<br/>
          <a className="underline text-brand-black" href="/terms">Terms</a>
          {' · '}
          <a className="underline text-brand-black" href="/privacy">Privacy</a>
        </div>
      </div>
    </main>
  )
}
