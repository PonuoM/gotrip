'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewTripPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currency, setCurrency] = useState('THB')
  const [budget, setBudget] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login?redirect=/trips/new')
    })
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate) {
      setError('Name, start date, and end date are required')
      return
    }
    if (endDate < startDate) {
      setError('End date must be on or after start date')
      return
    }

    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login?redirect=/trips/new')
      return
    }

    const { error: insertError } = await supabase
      .from('trips')
      .insert({
        name: name.trim(),
        destination: destination.trim() || null,
        start_date: startDate,
        end_date: endDate,
        default_currency: currency,
        budget_amount: budget ? Number(budget) : null,
        owner_id: user.id,
      })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // TODO: redirect to /trips/${data.id} once detail page exists
    router.replace('/')
  }

  return (
    <main className="min-h-screen bg-brand-white p-6">
      <div className="max-w-md mx-auto">

        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
            ← BACK
          </Link>
        </div>

        <div className="mt-6 mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[3px] text-gray-600">
            ★ NEW ADVENTURE
          </div>
          <h1 className="mt-3 font-black tracking-tighter text-[40px] leading-none">
            START A TRIP.
          </h1>
          <div className="brand-underline" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <Field label="TRIP NAME *">
            <input
              type="text"
              required
              maxLength={80}
              placeholder="Japan 2026"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={submitting}
              className="input"
            />
          </Field>

          <Field label="DESTINATION">
            <input
              type="text"
              maxLength={80}
              placeholder="Tokyo, Osaka, Kyoto"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              disabled={submitting}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="START *">
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={submitting}
                className="input"
              />
            </Field>
            <Field label="END *">
              <input
                type="date"
                required
                value={endDate}
                min={startDate || undefined}
                onChange={e => setEndDate(e.target.value)}
                disabled={submitting}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CURRENCY">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                disabled={submitting}
                className="input"
              >
                <option value="THB">THB ฿</option>
                <option value="JPY">JPY ¥</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
                <option value="KRW">KRW ₩</option>
                <option value="TWD">TWD NT$</option>
              </select>
            </Field>
            <Field label="BUDGET (optional)">
              <input
                type="number"
                min="0"
                step="100"
                placeholder="50000"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                disabled={submitting}
                className="input"
              />
            </Field>
          </div>

          {error && (
            <div className="text-sm font-bold p-3 rounded-xl border-2 bg-red-50 border-brand-red text-brand-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim() || !startDate || !endDate}
            className="btn-primary w-full mt-2 disabled:opacity-50"
          >
            {submitting ? 'CREATING...' : 'CREATE TRIP →'}
          </button>
        </form>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 2px solid #1A1A1A;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 700;
          background: white;
        }
        :global(.input:focus) {
          outline: none;
          box-shadow: 0 0 0 2px #E63946;
        }
      `}</style>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-black tracking-[2px] text-gray-600 mb-1.5">
        {label}
      </div>
      {children}
    </label>
  )
}
