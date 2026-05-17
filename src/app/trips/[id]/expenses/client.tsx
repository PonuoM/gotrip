'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  category_id: string | null
  paid_by: string | null
  paid_at: string
  notes: string | null
  expense_splits: Array<{ member_id: string; share_amount: number; is_settled: boolean }>
}

interface Member {
  id: string  // trip_members.id
  role: string
  user_id: string
  user_profiles: { display_name: string } | null
}

interface Category {
  id: string
  label_en: string
  icon: string
  color: string
}

interface Debt {
  from_member_id: string
  from_member_name: string
  to_member_id: string
  to_member_name: string
  amount: number
}

interface Props {
  tripId: string
  currency: string
  budget: number | null
  myMemberId: string
  canEdit: boolean
  expenses: Expense[]
  members: Member[]
  categories: Category[]
  debts: Debt[]
}

const CURRENCIES = ['THB', 'JPY', 'USD', 'EUR', 'KRW', 'TWD']

export function ExpensesClient(props: Props) {
  const { tripId, currency, budget, myMemberId, canEdit, expenses, members, categories, debts } = props
  const router = useRouter()
  const supabase = createClient()

  const [editing, setEditing] = useState<Partial<Expense> & { _splitWith?: string[] } | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const memberMap = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members])

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const budgetPct = budget && budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : 0

  // Per-person summary: paid - owed
  const myBalance = useMemo(() => {
    let paid = 0
    let owed = 0
    for (const exp of expenses) {
      if (exp.paid_by === myMemberId) paid += Number(exp.amount)
      const mine = exp.expense_splits.find(s => s.member_id === myMemberId)
      if (mine && !mine.is_settled) owed += Number(mine.share_amount)
    }
    return paid - owed
  }, [expenses, myMemberId])

  const startNew = () => {
    setEditing({
      id: undefined,
      description: '',
      amount: 0,
      currency,
      category_id: 'food',
      paid_by: myMemberId,
      paid_at: new Date().toISOString().slice(0, 10),
      _splitWith: members.map(m => m.id),
    })
    setError('')
  }

  const startEdit = (e: Expense) => {
    setEditing({
      ...e,
      _splitWith: e.expense_splits.map(s => s.member_id),
    })
    setError('')
  }

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!editing) return
    const amount = Number(editing.amount)
    if (!editing.description?.trim() || !amount || amount <= 0) {
      setError('Description and amount > 0 are required')
      return
    }
    const splitMembers = editing._splitWith || []
    if (splitMembers.length === 0) {
      setError('Select at least one person to split with')
      return
    }

    setSaving(true)
    setError('')

    const share = +(amount / splitMembers.length).toFixed(2)

    const payload = {
      trip_id: tripId,
      description: editing.description.trim(),
      amount,
      currency: editing.currency || currency,
      category_id: editing.category_id || null,
      paid_by: editing.paid_by || null,
      paid_at: editing.paid_at,
      notes: editing.notes?.trim() || null,
    }

    let expenseId = editing.id
    if (expenseId) {
      const { error: err } = await supabase.from('expenses').update(payload).eq('id', expenseId)
      if (err) return abort(err.message)
      await supabase.from('expense_splits').delete().eq('expense_id', expenseId)
    } else {
      const { data, error: err } = await supabase.from('expenses').insert(payload).select('id').single()
      if (err) return abort(err.message)
      expenseId = data!.id
    }

    const splitRows = splitMembers.map(memberId => ({
      expense_id: expenseId!,
      member_id: memberId,
      share_amount: share,
    }))
    const { error: splitErr } = await supabase.from('expense_splits').insert(splitRows)
    if (splitErr) return abort(splitErr.message)

    setEditing(null)
    setSaving(false)
    router.refresh()

    function abort(msg: string) {
      setError(msg)
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    // Splits cascade-delete via FK
    await supabase.from('expenses').delete().eq('id', id)
    router.refresh()
  }

  return (
    <>
      {error && (
        <div className="text-sm font-bold p-3 rounded-xl border-2 bg-red-50 border-brand-red text-brand-red mb-4">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="card-hero">
        <div className="text-[10px] font-black tracking-[2px] opacity-80">TRIP TOTAL</div>
        <div className="mt-1 text-[36px] font-black leading-none tracking-tighter">
          {formatCurrency(totalSpent, currency)}
        </div>
        {budget && (
          <>
            <div className="text-xs font-medium mt-1 opacity-80">
              of {formatCurrency(budget, currency)} ({budgetPct.toFixed(0)}%)
            </div>
            <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${budgetPct}%` }} />
            </div>
          </>
        )}
      </div>

      {/* My balance */}
      <div className={`mt-3 card-base p-3 flex justify-between items-center ${myBalance < 0 ? 'border-brand-red' : 'border-green-600'}`}>
        <div>
          <div className="text-[10px] font-black tracking-[2px] text-gray-600">YOUR BALANCE</div>
          <div className="text-[10px] text-gray-500 font-bold mt-0.5">
            {myBalance > 0 ? 'You are owed' : myBalance < 0 ? 'You owe' : 'All even'}
          </div>
        </div>
        <div className={`font-black text-xl ${myBalance < 0 ? 'text-brand-red' : 'text-green-700'}`}>
          {myBalance >= 0 ? '+' : ''}{formatCurrency(myBalance, currency)}
        </div>
      </div>

      {/* Settle-up summary */}
      {debts.length > 0 && (
        <SettleUpSection debts={debts} currency={currency} />
      )}

      {/* Add button */}
      {canEdit && !editing && (
        <button onClick={startNew} className="btn-primary w-full mt-6">
          ＋ NEW EXPENSE
        </button>
      )}

      {/* Form */}
      {editing && (
        <ExpenseForm
          editing={editing}
          categories={categories}
          members={members}
          saving={saving}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSubmit={save}
        />
      )}

      {/* List */}
      <div className="mt-8">
        <div className="text-xs font-black uppercase tracking-[2px] mb-3">
          ALL EXPENSES · {expenses.length}
        </div>
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            — no expenses yet —
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(exp => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                category={exp.category_id ? categoryMap[exp.category_id] : null}
                payer={exp.paid_by ? memberMap[exp.paid_by] : null}
                memberMap={memberMap}
                canEdit={canEdit}
                onEdit={() => startEdit(exp)}
                onDelete={() => remove(exp.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ===== Expense card with expandable splits =====

function ExpenseCard({ expense, category, payer, memberMap, canEdit, onEdit, onDelete }: {
  expense: Expense
  category: Category | null
  payer: Member | undefined
  memberMap: Record<string, Member>
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const settledCount = expense.expense_splits.filter(s => s.is_settled).length
  const allSettled = settledCount === expense.expense_splits.length && expense.expense_splits.length > 0

  const toggleSplit = async (memberId: string, isSettled: boolean) => {
    setBusy(memberId)
    await supabase
      .from('expense_splits')
      .update({
        is_settled: !isSettled,
        settled_at: !isSettled ? new Date().toISOString() : null,
      })
      .eq('expense_id', expense.id)
      .eq('member_id', memberId)
    router.refresh()
    setBusy(null)
  }

  return (
    <div className="card-base p-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-start gap-2.5"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: (category?.color || '#1A1A1A') + '20' }}
        >
          {category?.icon || '💰'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-black text-sm leading-tight truncate">
              {expense.description}
            </div>
            <div className="font-black text-sm shrink-0">
              {formatCurrency(Number(expense.amount), expense.currency)}
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-bold mt-0.5">
            Paid by {payer?.user_profiles?.display_name || 'Unknown'}
            {' · '}{new Date(expense.paid_at).toLocaleDateString('en-GB')}
            {' · '}
            {allSettled
              ? <span className="text-green-700">all settled ✓</span>
              : `${settledCount}/${expense.expense_splits.length} settled`}
            <span className="ml-1 text-gray-300">{open ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-500 mb-1">
            SPLITS — tap to mark settled
          </div>
          {expense.expense_splits.map(s => {
            const memberName = memberMap[s.member_id]?.user_profiles?.display_name || '?'
            const isPayer = s.member_id === expense.paid_by
            return (
              <button
                key={s.member_id}
                type="button"
                disabled={busy === s.member_id || isPayer}
                onClick={() => toggleSplit(s.member_id, s.is_settled)}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg border-2 transition ${
                  isPayer
                    ? 'border-gray-100 bg-gray-50 cursor-default'
                    : s.is_settled
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:border-brand-red'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[8px] font-black ${
                    s.is_settled ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'
                  }`}>
                    {s.is_settled && '✓'}
                  </div>
                  <span className={`text-xs font-bold ${s.is_settled ? 'line-through text-gray-400' : ''}`}>
                    {memberName}{isPayer && ' (paid)'}
                  </span>
                </div>
                <span className={`text-xs font-black ${s.is_settled ? 'text-gray-400' : ''}`}>
                  {formatCurrency(Number(s.share_amount), expense.currency)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={onEdit}
            className="text-[10px] font-black tracking-wider text-gray-600 border border-gray-200 rounded-pill px-2 py-1"
          >
            EDIT
          </button>
          <button
            onClick={onDelete}
            className="text-[10px] font-black tracking-wider text-brand-red border border-brand-red/30 rounded-pill px-2 py-1"
          >
            ✗
          </button>
        </div>
      )}
    </div>
  )
}

// ===== Settle-up =====

function SettleUpSection({ debts, currency }: { debts: Debt[]; currency: string }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-black uppercase tracking-[2px] mb-2">SETTLE UP</div>
      <div className="space-y-2">
        {debts.map((d, i) => (
          <div key={i} className="card-base p-3 flex items-center justify-between">
            <div className="text-sm font-bold">
              <span className="text-brand-red">{d.from_member_name}</span>
              <span className="text-gray-400 mx-2">→</span>
              <span className="text-green-700">{d.to_member_name}</span>
            </div>
            <div className="font-black">{formatCurrency(Number(d.amount), currency)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Form =====

function ExpenseForm({ editing, categories, members, saving, onChange, onCancel, onSubmit }: {
  editing: Partial<Expense> & { _splitWith?: string[] }
  categories: Category[]
  members: Member[]
  saving: boolean
  onChange: (e: Partial<Expense> & { _splitWith?: string[] }) => void
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const upd = (patch: Partial<Expense> & { _splitWith?: string[] }) => onChange({ ...editing, ...patch })
  const splitWith = editing._splitWith || []

  const toggleSplit = (memberId: string) => {
    const next = splitWith.includes(memberId)
      ? splitWith.filter(id => id !== memberId)
      : [...splitWith, memberId]
    upd({ _splitWith: next })
  }

  const splitAll = () => upd({ _splitWith: members.map(m => m.id) })

  const sharePreview = editing.amount && splitWith.length > 0
    ? Number(editing.amount) / splitWith.length
    : 0

  return (
    <form onSubmit={onSubmit} className="card-base p-4 border-brand-red mt-6 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs font-black tracking-[2px]">
          {editing.id ? 'EDIT EXPENSE' : '＋ NEW EXPENSE'}
        </div>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-gray-500">✗</button>
      </div>

      <label className="block">
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">WHAT *</div>
        <input
          type="text"
          required
          maxLength={120}
          value={editing.description || ''}
          onChange={e => upd({ description: e.target.value })}
          placeholder="e.g. Dinner at Ichiran"
          className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-2 block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">AMOUNT *</div>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={editing.amount || ''}
            onChange={e => upd({ amount: Number(e.target.value) })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-lg"
          />
        </label>
        <label className="block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">CURRENCY</div>
          <select
            value={editing.currency || 'THB'}
            onChange={e => upd({ currency: e.target.value })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div>
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">CATEGORY</div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => upd({ category_id: c.id })}
              className={`text-xs font-bold px-2 py-1 rounded-pill border-2 ${
                editing.category_id === c.id
                  ? 'border-brand-black bg-brand-black text-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {c.icon} {c.label_en}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">PAID BY</div>
          <select
            value={editing.paid_by || ''}
            onChange={e => upd({ paid_by: e.target.value || null })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-sm"
          >
            <option value="">—</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.user_profiles?.display_name || 'Unknown'}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">DATE</div>
          <input
            type="date"
            value={editing.paid_at?.slice(0, 10) || ''}
            onChange={e => upd({ paid_at: e.target.value })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-sm"
          />
        </label>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600">SPLIT WITH</div>
          <button type="button" onClick={splitAll} className="text-[10px] font-black text-brand-red">
            ALL
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleSplit(m.id)}
              className={`text-xs font-bold px-2 py-1 rounded-pill border-2 ${
                splitWith.includes(m.id)
                  ? 'border-brand-red bg-brand-red text-white'
                  : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              {m.user_profiles?.display_name || '?'}
            </button>
          ))}
        </div>
        {sharePreview > 0 && (
          <div className="text-[10px] text-gray-500 font-bold mt-2">
            ↳ {formatCurrency(sharePreview, editing.currency || 'THB')} each ({splitWith.length} people)
          </div>
        )}
      </div>

      <label className="block">
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">NOTES</div>
        <textarea
          rows={2}
          value={editing.notes || ''}
          onChange={e => upd({ notes: e.target.value })}
          className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-sm"
        />
      </label>

      <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
        {saving ? 'SAVING...' : (editing.id ? 'UPDATE' : 'ADD EXPENSE')}
      </button>
    </form>
  )
}
