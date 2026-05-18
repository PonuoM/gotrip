'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT, useLang } from '@/components/LangProvider'
import { confirmDialog } from '@/lib/dialog'

const CURRENCIES = ['THB', 'JPY', 'USD', 'EUR', 'KRW', 'TWD']
const STATUSES = [
  { id: 'planning',  label: 'Planning' },
  { id: 'active',    label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived',  label: 'Archived' },
]

interface Trip {
  id: string
  name: string
  destination: string | null
  description: string | null
  start_date: string
  end_date: string
  default_currency: string
  budget_amount: number | null
  status: string
}

export function EditTripClient({ trip }: { trip: Trip }) {
  const router = useRouter()
  const supabase = createClient()
  const t = useT()
  const lang = useLang()

  const [form, setForm] = useState({
    name: trip.name,
    destination: trip.destination || '',
    description: trip.description || '',
    start_date: trip.start_date,
    end_date: trip.end_date,
    default_currency: trip.default_currency,
    budget_amount: trip.budget_amount ? String(trip.budget_amount) : '',
    status: trip.status,
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const upd = (patch: Partial<typeof form>) => setForm({ ...form, ...patch })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (form.end_date < form.start_date) {
      setError(t('newtrip.err_dates'))
      return
    }
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('trips')
      .update({
        name: form.name.trim(),
        destination: form.destination.trim() || null,
        description: form.description.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        default_currency: form.default_currency,
        budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
        status: form.status,
      })
      .eq('id', trip.id)

    if (error) setError(error.message)
    else {
      setSavedAt(new Date().toLocaleTimeString())
      router.refresh()
    }
    setSaving(false)
  }

  const archive = async () => {
    const ok = await confirmDialog({
      title: lang === 'th' ? 'เก็บเข้าคลัง' : 'Archive trip',
      message: t('edit.confirm_archive'),
      confirmLabel: lang === 'th' ? 'เก็บ' : 'ARCHIVE',
    })
    if (!ok) return
    setSaving(true)
    await supabase.from('trips').update({ status: 'archived' }).eq('id', trip.id)
    router.push(`/trips/${trip.id}`)
  }

  const remove = async () => {
    const ok = await confirmDialog({
      title: lang === 'th' ? 'ลบทริปถาวร' : 'Delete trip forever',
      message: lang === 'th'
        ? `จะลบ "${trip.name}" และข้อมูลทั้งหมด — กิจกรรม, ค่าใช้จ่าย, เช็คลิสต์, ไฟล์ ทั้งหมด ย้อนกลับไม่ได้\n\nพิมพ์ "DELETE" เพื่อยืนยัน`
        : `This will permanently delete "${trip.name}" and ALL its data — activities, expenses, checklists, files. This cannot be undone.\n\nType "DELETE" to confirm.`,
      confirmLabel: lang === 'th' ? 'ลบถาวร' : 'DELETE FOREVER',
      danger: true,
      requireText: 'DELETE',
      requireTextHint: lang === 'th' ? 'พิมพ์ DELETE' : 'Type DELETE',
    })
    if (!ok) return

    setDeleting(true)
    setError('')
    const { error } = await supabase.from('trips').delete().eq('id', trip.id)
    if (error) {
      setError(error.message)
      setDeleting(false)
    } else {
      router.push('/trips')
    }
  }

  return (
    <>
      <form onSubmit={save} className="space-y-4">
        <Field label={t('newtrip.name')}>
          <input
            type="text"
            required
            maxLength={80}
            value={form.name}
            onChange={e => upd({ name: e.target.value })}
            className="input"
          />
        </Field>

        <Field label={t('newtrip.dest')}>
          <input
            type="text"
            maxLength={80}
            value={form.destination}
            onChange={e => upd({ destination: e.target.value })}
            className="input"
          />
        </Field>

        <Field label={t('edit.notes')}>
          <textarea
            rows={3}
            maxLength={500}
            value={form.description}
            onChange={e => upd({ description: e.target.value })}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('newtrip.start')}>
            <input
              type="date"
              required
              value={form.start_date}
              onChange={e => upd({ start_date: e.target.value })}
              className="input"
            />
          </Field>
          <Field label={t('newtrip.end')}>
            <input
              type="date"
              required
              value={form.end_date}
              min={form.start_date}
              onChange={e => upd({ end_date: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('newtrip.curr')}>
            <select
              value={form.default_currency}
              onChange={e => upd({ default_currency: e.target.value })}
              className="input"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label={t('newtrip.budget')}>
            <input
              type="number"
              min="0"
              step="100"
              value={form.budget_amount}
              onChange={e => upd({ budget_amount: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        <Field label={t('edit.status')}>
          <select
            value={form.status}
            onChange={e => upd({ status: e.target.value })}
            className="input"
          >
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>

        {error && (
          <div className="text-sm font-bold p-3 rounded-xl border-2 bg-red-50 border-brand-red text-brand-red">
            {error}
          </div>
        )}

        {savedAt && (
          <div className="text-xs font-bold text-green-700">{t('settings.saved')} {savedAt}</div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
          {saving ? t('edit.saving') : t('edit.save')}
        </button>
      </form>

      <div className="mt-12 border-t-2 border-dashed border-gray-200 pt-6 space-y-3">
        <div className="text-xs font-black tracking-[2px] text-gray-500">{t('edit.danger')}</div>

        {form.status !== 'archived' && (
          <button
            onClick={archive}
            disabled={saving || deleting}
            className="btn-secondary w-full disabled:opacity-50"
          >
            {t('edit.archive')}
          </button>
        )}

        <button
          onClick={remove}
          disabled={saving || deleting}
          className="w-full bg-brand-red text-white border-2 border-brand-black rounded-pill
                     px-6 py-3.5 font-black text-sm tracking-wider
                     hover:brightness-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {deleting ? t('edit.deleting') : t('edit.delete')}
        </button>
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
    </>
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
