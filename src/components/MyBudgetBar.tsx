'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Props {
  myMemberId: string
  budget: number | null     // current member's budget (null = not set)
  spent: number              // total of my expense_splits shares
  currency: string
  lang?: 'th' | 'en'
}

export function MyBudgetBar({ myMemberId, budget, spent, currency, lang = 'en' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(budget ? String(budget) : '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const next = draft.trim() === '' ? null : Number(draft)
    await supabase
      .from('trip_members')
      .update({ budget_amount: next })
      .eq('id', myMemberId)
    setEditing(false)
    setSaving(false)
    router.refresh()
  }

  const hasBudget = budget != null && budget > 0
  const pct = hasBudget ? Math.min(100, (spent / budget!) * 100) : 0
  const over = hasBudget && spent > budget!
  const remaining = hasBudget ? budget! - spent : 0
  const barColor = over ? 'bg-brand-red' : pct > 80 ? 'bg-orange-500' : 'bg-green-600'

  return (
    <div className="mt-4 card-base p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-[10px] font-black tracking-[2px] text-gray-600">
          {lang === 'th' ? 'งบของฉัน' : 'MY BUDGET'}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[10px] font-black tracking-wider text-brand-red"
          >
            {hasBudget
              ? (lang === 'th' ? '✎ แก้' : '✎ EDIT')
              : (lang === 'th' ? '＋ ตั้งงบ' : '＋ SET BUDGET')}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" step="100"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={lang === 'th' ? 'จำนวนเงิน (ว่าง = ลบ)' : 'amount (blank = clear)'}
              autoFocus
              className="flex-1 border-2 border-brand-black rounded-lg py-2 px-3 font-bold"
            />
            <span className="text-xs font-bold text-gray-500">{currency}</span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setEditing(false); setDraft(budget ? String(budget) : '') }}
              disabled={saving}
              className="flex-1 text-[10px] font-black tracking-wider text-gray-500 border-2 border-gray-300 rounded-pill py-2"
            >
              {lang === 'th' ? 'ยกเลิก' : 'CANCEL'}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 text-[10px] font-black tracking-wider bg-brand-red text-white border-2 border-brand-black rounded-pill py-2"
            >
              {saving ? (lang === 'th' ? 'กำลังบันทึก…' : 'SAVING…') : (lang === 'th' ? 'บันทึก' : 'SAVE')}
            </button>
          </div>
        </div>
      ) : hasBudget ? (
        <>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs font-bold">
            <span>{formatCurrency(spent, currency)}</span>
            <span className="text-gray-500">/ {formatCurrency(budget!, currency)}</span>
          </div>
          <div className={`mt-1 text-[11px] font-bold ${over ? 'text-brand-red' : 'text-gray-500'}`}>
            {over
              ? (lang === 'th' ? `เกินงบ ${formatCurrency(spent - budget!, currency)}` : `Over by ${formatCurrency(spent - budget!, currency)}`)
              : (lang === 'th' ? `เหลือ ${formatCurrency(remaining, currency)}` : `${formatCurrency(remaining, currency)} left`)}
          </div>
        </>
      ) : (
        <div className="text-sm font-bold flex justify-between items-baseline">
          <span className="text-gray-400">
            {lang === 'th' ? 'ยังไม่ตั้งงบ' : 'No budget set'}
          </span>
          <span className="text-brand-red">
            −{formatCurrency(spent, currency)}
          </span>
        </div>
      )}
    </div>
  )
}
