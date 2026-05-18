'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { t as translate, type TKey } from '@/lib/i18n'
import { AvatarBadge } from '@/components/AvatarBadge'
import { MyBudgetBar } from '@/components/MyBudgetBar'
import { confirmDialog, alertDialog } from '@/lib/dialog'

interface Split {
  id: string
  member_id: string | null
  slot_label: string | null
  share_amount: number
  is_settled: boolean
  settled_proof_url: string | null
}

interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  category_id: string | null
  paid_by: string | null
  paid_at: string
  notes: string | null
  receipt_url: string | null
  expense_splits: Split[]
}

interface Member {
  id: string
  role: string
  user_id: string
  user_profiles: {
    display_name: string
    avatar_animal?: string | null
    avatar_bg_color?: string | null
  } | null
}

interface Category {
  id: string
  label_en: string
  label_th: string
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
  myBudget: number | null
  myMemberId: string
  canEdit: boolean
  expenses: Expense[]
  members: Member[]
  categories: Category[]
  debts: Debt[]
  lang: 'th' | 'en'
}

const pickCat = (c: Category | undefined, lang: 'th' | 'en') =>
  c ? (lang === 'th' ? c.label_th : c.label_en) : ''

const CURRENCIES = ['THB', 'JPY', 'USD', 'EUR', 'KRW', 'TWD']

// ====================================================================

export function ExpensesClient(props: Props) {
  const { tripId, currency, myBudget, myMemberId, canEdit, expenses, members, categories, debts, lang } = props
  const router = useRouter()
  const supabase = createClient()
  const t = (k: TKey) => translate(lang, k)

  const categoryMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories])
  const memberMap   = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members])

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // My total share across the trip (regardless of who fronted the cash)
  const mySpent = useMemo(() => {
    let total = 0
    for (const exp of expenses) {
      const mine = exp.expense_splits.find(s => s.member_id === myMemberId)
      if (mine) total += Number(mine.share_amount)
    }
    return total
  }, [expenses, myMemberId])

  const myBalance = useMemo(() => {
    let paid = 0, owed = 0
    for (const exp of expenses) {
      if (exp.paid_by === myMemberId) paid += Number(exp.amount)
      const mine = exp.expense_splits.find(s => s.member_id === myMemberId)
      if (mine && !mine.is_settled && exp.paid_by !== myMemberId) owed += Number(mine.share_amount)
    }
    return paid - owed
  }, [expenses, myMemberId])

  // ===== List filter / sort =====
  type ModeFilter = 'all' | 'personal' | 'shared'
  type SortBy = 'default' | 'desc' | 'asc'
  const [filterMode, setFilterMode] = useState<ModeFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('default')
  const [filterOpen, setFilterOpen] = useState(false)

  const isPersonalExp = (e: Expense) =>
    e.expense_splits.length === 1 &&
    e.expense_splits[0].member_id != null &&
    e.expense_splits[0].member_id === e.paid_by

  const visibleExpenses = useMemo(() => {
    let list: Expense[] = expenses
    if (filterMode === 'personal') list = list.filter(isPersonalExp)
    else if (filterMode === 'shared') list = list.filter(e => !isPersonalExp(e))
    if (sortBy === 'desc') list = [...list].sort((a, b) => Number(b.amount) - Number(a.amount))
    else if (sortBy === 'asc') list = [...list].sort((a, b) => Number(a.amount) - Number(b.amount))
    return list
  }, [expenses, filterMode, sortBy])

  const hasActiveFilters = filterMode !== 'all' || sortBy !== 'default'

  const modeLabel = (m: ModeFilter) =>
    m === 'all'      ? (lang === 'th' ? 'ทั้งหมด' : 'All')
    : m === 'shared' ? (lang === 'th' ? '👥 หาร' : '👥 Shared')
    :                  (lang === 'th' ? '🍙 ส่วนตัว' : '🍙 Personal')

  const sortLabel = (s: SortBy) =>
    s === 'default' ? (lang === 'th' ? '🕒 ตามระบบ' : '🕒 Newest')
    : s === 'desc'  ? (lang === 'th' ? '💸 แพง→ถูก' : '💸 High→Low')
    :                 (lang === 'th' ? '🪙 ถูก→แพง' : '🪙 Low→High')

  // ===== New / Edit form state =====
  const [editing, setEditing] = useState<null | {
    id?: string
    mode: 'personal' | 'shared'
    description: string
    amount: string
    currency: string
    category_id: string
    paid_by: string
    paid_at: string
    notes: string
    split_count: number
    split_member_ids: (string | null)[]    // length = split_count, each = member id or null (ว่าง)
    receipt_url: string | null
    receipt_file?: File | null
  }>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const startNew = (mode: 'personal' | 'shared' = 'shared') => {
    setEditing({
      mode,
      description: '',
      amount: '',
      currency,
      category_id: 'food',
      paid_by: myMemberId,
      paid_at: new Date().toISOString().slice(0, 10),
      notes: '',
      split_count: mode === 'personal' ? 1 : (members.length || 1),
      split_member_ids: mode === 'personal' ? [myMemberId] : members.map(m => m.id),
      receipt_url: null,
      receipt_file: null,
    })
    setError('')
  }

  const startEdit = (e: Expense) => {
    const inferredMode: 'personal' | 'shared' =
      e.expense_splits.length === 1 &&
      e.expense_splits[0].member_id != null &&
      e.expense_splits[0].member_id === e.paid_by
        ? 'personal'
        : 'shared'
    setEditing({
      id: e.id,
      mode: inferredMode,
      description: e.description,
      amount: String(e.amount),
      currency: e.currency,
      category_id: e.category_id || 'food',
      paid_by: e.paid_by || '',
      paid_at: e.paid_at,
      notes: e.notes || '',
      split_count: e.expense_splits.length,
      split_member_ids: e.expense_splits.map(s => s.member_id),
      receipt_url: e.receipt_url,
      receipt_file: null,
    })
    setError('')
  }

  // ===== Save expense =====
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!editing) return
    const amount = Number(editing.amount)
    if (!editing.description.trim() || !amount || amount <= 0) {
      setError(t('exp.err_required'))
      return
    }
    if (editing.split_count < 1) {
      setError(lang === 'th' ? 'หารอย่างน้อย 1 คน' : 'Split must be ≥ 1 person')
      return
    }

    setSaving(true)
    setError('')

    // Personal mode → force single split assigned to me, paid by me
    const isPersonal = editing.mode === 'personal'
    const effectivePaidBy = isPersonal ? myMemberId : (editing.paid_by || null)
    const effectiveSplitCount = isPersonal ? 1 : editing.split_count
    const effectiveSplitMemberIds: (string | null)[] = isPersonal
      ? [myMemberId]
      : editing.split_member_ids

    // Upload receipt to storage if a new file is attached
    let receipt_url = editing.receipt_url
    if (editing.receipt_file) {
      const file = editing.receipt_file
      const ext = file.name.split('.').pop() || 'bin'
      const key = `${tripId}/receipts/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('trip-documents')
        .upload(key, file, { contentType: file.type || 'application/octet-stream' })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      receipt_url = key
    }

    const share = +(amount / effectiveSplitCount).toFixed(2)

    const payload = {
      trip_id: tripId,
      description: editing.description.trim(),
      amount,
      currency: editing.currency || currency,
      category_id: editing.category_id || null,
      paid_by: effectivePaidBy,
      paid_at: editing.paid_at,
      notes: editing.notes.trim() || null,
      receipt_url,
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

    // Build splits — payer's own row is auto-settled
    const splits = effectiveSplitMemberIds.map((mid, i) => ({
      expense_id: expenseId!,
      member_id: mid,
      slot_label: mid ? null : (lang === 'th' ? `ว่าง ${i + 1}` : `Open ${i + 1}`),
      share_amount: share,
      is_settled: mid !== null && mid === effectivePaidBy,
    }))
    const { error: splitErr } = await supabase.from('expense_splits').insert(splits)
    if (splitErr) return abort(splitErr.message)

    setEditing(null)
    setSaving(false)
    router.refresh()

    function abort(msg: string) { setError(msg); setSaving(false) }
  }

  const remove = async (id: string) => {
    const ok = await confirmDialog({
      title: lang === 'th' ? 'ลบรายการ' : 'Delete expense',
      message: t('exp.delete_confirm'),
      confirmLabel: lang === 'th' ? 'ลบ' : 'DELETE',
      danger: true,
    })
    if (!ok) return
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

      {/* Summary — group total */}
      <div className="card-hero">
        <div className="text-[10px] font-black tracking-[2px] opacity-80">{t('exp.trip_total')}</div>
        <div className="mt-1 text-[36px] font-black leading-none tracking-tighter">
          {formatCurrency(totalSpent, currency)}
        </div>
        <div className="text-xs font-medium mt-1 opacity-80">
          {lang === 'th' ? 'รวมของทุกคนในทริป' : 'Across everyone in the trip'}
        </div>
      </div>

      {/* My personal budget */}
      <MyBudgetBar
        myMemberId={myMemberId}
        budget={myBudget}
        spent={mySpent}
        currency={currency}
        lang={lang}
      />

      {/* My balance */}
      <div className={`mt-3 card-base p-3 flex justify-between items-center ${myBalance < 0 ? 'border-brand-red' : 'border-green-600'}`}>
        <div>
          <div className="text-[10px] font-black tracking-[2px] text-gray-600">{t('exp.your_balance')}</div>
          <div className="text-[10px] text-gray-500 font-bold mt-0.5">
            {myBalance > 0 ? t('exp.youre_owed') : myBalance < 0 ? t('exp.you_owe') : t('exp.all_even')}
          </div>
        </div>
        <div className={`font-black text-xl ${myBalance < 0 ? 'text-brand-red' : 'text-green-700'}`}>
          {myBalance >= 0 ? '+' : ''}{formatCurrency(myBalance, currency)}
        </div>
      </div>

      {debts.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-black uppercase tracking-[2px] mb-2">{t('exp.settle_up')}</div>
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
      )}

      {canEdit && !editing && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={() => startNew('personal')} className="rounded-pill border-2 border-brand-black bg-white text-brand-black font-black tracking-wider text-xs py-3 active:scale-95 transition">
            🍙 {lang === 'th' ? 'ส่วนตัว' : 'PERSONAL'}
          </button>
          <button onClick={() => startNew('shared')} className="btn-primary py-3">
            👥 {lang === 'th' ? 'หารกัน' : 'SHARED'}
          </button>
        </div>
      )}

      {editing && (
        <ExpenseForm
          editing={editing}
          categories={categories}
          members={members}
          myMemberId={myMemberId}
          saving={saving}
          lang={lang}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSubmit={save}
        />
      )}

      {/* List */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-3 gap-2">
          <div className="text-xs font-black uppercase tracking-[2px]">
            {t('exp.all_expenses')} · {visibleExpenses.length}
            {visibleExpenses.length !== expenses.length && (
              <span className="text-gray-400"> / {expenses.length}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={`relative text-[10px] font-black tracking-wider px-3 py-1.5 rounded-pill border-2 whitespace-nowrap ${
              hasActiveFilters
                ? 'bg-brand-black text-white border-brand-black'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            ⚙ {lang === 'th' ? 'ตัวกรอง' : 'FILTER'} ▾
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-red rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {visibleExpenses.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {expenses.length === 0
              ? t('exp.no_expenses')
              : (lang === 'th' ? 'ไม่มีรายการที่ตรงกับตัวกรอง' : 'No expenses match the filter')}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleExpenses.map(exp => (
              <ExpenseCard
                key={exp.id}
                tripId={tripId}
                expense={exp}
                category={exp.category_id ? categoryMap[exp.category_id] : null}
                memberMap={memberMap}
                allMembers={members}
                myMemberId={myMemberId}
                canEdit={canEdit}
                lang={lang}
                onEdit={() => startEdit(exp)}
                onDelete={() => remove(exp.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter sheet — bottom on mobile, centered on larger screens */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] dialog-fade"
          onMouseDown={() => setFilterOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border-2 border-brand-black rounded-t-2xl rounded-b-none sm:rounded-2xl sm:m-4 p-5 pb-7 dialog-rise"
            onMouseDown={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="text-xs font-black tracking-[2px]">
                ⚙ {lang === 'th' ? 'ตัวกรอง' : 'FILTER'}
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="text-gray-400 text-lg leading-none w-7 h-7 flex items-center justify-center"
                aria-label="close"
              >
                ✗
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-black tracking-[1.5px] text-gray-500 mb-2">
                  {lang === 'th' ? 'ประเภท' : 'TYPE'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'shared', 'personal'] as ModeFilter[]).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilterMode(key)}
                      className={`text-[11px] font-black tracking-wider px-3 py-2 rounded-pill border-2 transition ${
                        filterMode === key
                          ? 'bg-brand-black text-white border-brand-black'
                          : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {modeLabel(key)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-black tracking-[1.5px] text-gray-500 mb-2">
                  {lang === 'th' ? 'เรียงลำดับ' : 'SORT'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['default', 'desc', 'asc'] as SortBy[]).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortBy(key)}
                      className={`text-[11px] font-black tracking-wider px-3 py-2 rounded-pill border-2 transition ${
                        sortBy === key
                          ? 'bg-brand-red text-white border-brand-red'
                          : 'bg-white text-gray-500 border-gray-200'
                      }`}
                    >
                      {sortLabel(key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => { setFilterMode('all'); setSortBy('default') }}
                  className="text-[11px] font-black tracking-wider px-4 py-2.5 rounded-pill border-2 border-gray-300 text-gray-500 bg-white"
                >
                  {lang === 'th' ? 'ล้าง' : 'CLEAR'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 btn-primary"
              >
                {lang === 'th' ? 'เสร็จ' : 'DONE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ===== Expense card =====================================================

function ExpenseCard({
  tripId, expense, category, memberMap, allMembers, myMemberId, canEdit, lang,
  onEdit, onDelete,
}: {
  tripId: string
  expense: Expense
  category: Category | null
  memberMap: Record<string, Member>
  allMembers: Member[]
  myMemberId: string
  canEdit: boolean
  lang: 'th' | 'en'
  onEdit: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [claimFor, setClaimFor] = useState<string | null>(null)  // split id we're assigning
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const t = (k: TKey) => translate(lang, k)

  const payer = expense.paid_by ? memberMap[expense.paid_by] : null
  const settledCount = expense.expense_splits.filter(s => s.is_settled).length
  const allSettled = settledCount === expense.expense_splits.length && expense.expense_splits.length > 0
  const isPersonal =
    expense.expense_splits.length === 1 &&
    expense.expense_splits[0].member_id != null &&
    expense.expense_splits[0].member_id === expense.paid_by

  // unclaimed members for the "ว่าง" picker
  const unclaimed = allMembers.filter(
    m => !expense.expense_splits.some(s => s.member_id === m.id)
  )

  const toggleSplit = async (split: Split) => {
    if (!split.member_id) return
    setBusy(split.id)
    await supabase
      .from('expense_splits')
      .update({
        is_settled: !split.is_settled,
        settled_at: !split.is_settled ? new Date().toISOString() : null,
      })
      .eq('id', split.id)
    router.refresh()
    setBusy(null)
  }

  const claim = async (splitId: string, memberId: string) => {
    setBusy(splitId)
    const { error } = await supabase.rpc('claim_expense_slot', {
      p_split_id: splitId,
      p_member_id: memberId,
    })
    if (error) await alertDialog({ title: lang === 'th' ? 'ผิดพลาด' : 'Error', message: error.message })
    setClaimFor(null)
    router.refresh()
    setBusy(null)
  }

  const viewReceipt = async () => {
    if (!expense.receipt_url) return
    if (receiptUrl) { window.open(receiptUrl, '_blank'); return }
    const { data } = await supabase.storage.from('trip-documents').createSignedUrl(expense.receipt_url, 60)
    if (data?.signedUrl) {
      setReceiptUrl(data.signedUrl)
      window.open(data.signedUrl, '_blank')
    }
  }

  return (
    <div className="card-base p-3">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left flex items-start gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: (category?.color || '#1A1A1A') + '20' }}
        >
          {category?.icon || '💰'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-black text-sm leading-tight truncate flex items-center gap-1">
              {expense.description}
              {expense.receipt_url && <span title="receipt">📷</span>}
            </div>
            <div className="font-black text-sm shrink-0">
              {formatCurrency(Number(expense.amount), expense.currency)}
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-bold mt-0.5 flex items-center flex-wrap gap-x-1">
            {isPersonal ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-pill">
                🍙 {lang === 'th' ? 'ส่วนตัว' : 'PERSONAL'}
              </span>
            ) : (
              <>
                {t('exp.paid_by_label')} {payer?.user_profiles?.display_name || '?'}
              </>
            )}
            <span>·</span>
            <span>{new Date(expense.paid_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok' })}</span>
            {!isPersonal && (
              <>
                <span>·</span>
                {allSettled
                  ? <span className="text-green-700">{t('exp.all_settled')}</span>
                  : <span>{settledCount}/{expense.expense_splits.length} {t('exp.settled')}</span>}
              </>
            )}
            <span className="ml-1 text-gray-300">{open ? '▲' : '▼'}</span>
          </div>

          {/* Avatar/slot pile (hidden for personal — only one person) */}
          {!isPersonal && (
          <div className="flex flex-wrap gap-1 mt-1.5 items-center">
            {expense.expense_splits.map(s => {
              const mem = s.member_id ? memberMap[s.member_id] : null
              const isMe = s.member_id === myMemberId
              if (!mem) {
                return (
                  <span key={s.id} className="text-[9px] font-bold border-2 border-dashed border-gray-300 text-gray-400 px-2 py-0.5 rounded-full">
                    {lang === 'th' ? 'ว่าง' : 'Open'}
                  </span>
                )
              }
              return (
                <div key={s.id} className="relative" title={mem.user_profiles?.display_name || ''}>
                  <AvatarBadge
                    animal={mem.user_profiles?.avatar_animal}
                    bgColor={mem.user_profiles?.avatar_bg_color}
                    fallbackLetter={mem.user_profiles?.display_name?.[0]}
                    size="sm"
                    ringClass={isMe ? 'ring-2 ring-brand-red' : ''}
                    className={s.is_settled ? 'opacity-40' : ''}
                  />
                  {s.is_settled && (
                    <span className="absolute inset-0 flex items-center justify-center bg-green-600/85 text-white text-[10px] font-black rounded-full">✓</span>
                  )}
                </div>
              )
            })}
          </div>
          )}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-500 mb-1">
            {t('exp.splits')}
          </div>
          {expense.expense_splits.map(s => {
            const mem = s.member_id ? memberMap[s.member_id] : null
            const isPayer = s.member_id != null && s.member_id === expense.paid_by
            const isMe = s.member_id === myMemberId
            const memberName = mem?.user_profiles?.display_name || (lang === 'th' ? 'ว่าง' : 'Open slot')

            // Empty slot row → "claim" / assign picker
            if (!mem) {
              return (
                <div key={s.id} className="space-y-1">
                  <div className="w-full flex items-center justify-between gap-2 p-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-4 h-4 rounded border-2 border-dashed border-gray-300" />
                      <span className="text-xs font-bold text-gray-400 truncate">
                        {s.slot_label || (lang === 'th' ? 'ว่าง' : 'Open')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-gray-500">
                        {formatCurrency(Number(s.share_amount), expense.currency)}
                      </span>
                      {canEdit && unclaimed.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setClaimFor(claimFor === s.id ? null : s.id)}
                          className="text-[10px] font-black tracking-wider bg-brand-black text-white rounded-pill px-2 py-0.5"
                        >
                          {lang === 'th' ? 'ใส่ชื่อ' : 'CLAIM'}
                        </button>
                      )}
                    </div>
                  </div>
                  {claimFor === s.id && (
                    <div className="flex flex-wrap gap-1 pl-2">
                      {unclaimed.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          disabled={busy === s.id}
                          onClick={() => claim(s.id, m.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded-pill border-2 border-brand-black bg-white"
                        >
                          + {m.user_profiles?.display_name || '?'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <button
                key={s.id}
                type="button"
                disabled={busy === s.id || isPayer}
                onClick={() => toggleSplit(s)}
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
                    {memberName}{isPayer && ` ${t('exp.paid_label')}`}{isMe && !isPayer && ' ★'}
                  </span>
                </div>
                <span className={`text-xs font-black ${s.is_settled ? 'text-gray-400' : ''}`}>
                  {formatCurrency(Number(s.share_amount), expense.currency)}
                </span>
              </button>
            )
          })}

          {expense.receipt_url && (
            <button
              type="button"
              onClick={viewReceipt}
              className="w-full mt-2 text-[11px] font-bold text-brand-red border-2 border-brand-red/30 rounded-pill py-1.5"
            >
              📷 {lang === 'th' ? 'ดูใบเสร็จ' : 'View receipt'}
            </button>
          )}

          {expense.notes && (
            <div className="mt-2 text-[11px] text-gray-600 italic">"{expense.notes}"</div>
          )}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
          <button onClick={onEdit} className="text-[10px] font-black tracking-wider text-gray-600 border border-gray-200 rounded-pill px-2 py-1">
            EDIT
          </button>
          <button onClick={onDelete} className="text-[10px] font-black tracking-wider text-brand-red border border-brand-red/30 rounded-pill px-2 py-1">
            ✗
          </button>
        </div>
      )}
    </div>
  )
}

// ===== Expense form ======================================================

function ExpenseForm({
  editing, categories, members, myMemberId, saving, lang, onChange, onCancel, onSubmit,
}: {
  editing: any
  categories: Category[]
  members: Member[]
  myMemberId: string
  saving: boolean
  lang: 'th' | 'en'
  onChange: (e: any) => void
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const t = (k: TKey) => translate(lang, k)
  const upd = (patch: any) => onChange({ ...editing, ...patch })

  const isPersonal = editing.mode === 'personal'

  const setMode = (mode: 'personal' | 'shared') => {
    if (mode === editing.mode) return
    if (mode === 'personal') {
      upd({
        mode,
        paid_by: myMemberId,
        split_count: 1,
        split_member_ids: [myMemberId],
      })
    } else {
      upd({
        mode,
        split_count: members.length || 1,
        split_member_ids: members.map(m => m.id),
      })
    }
  }

  const setSplitCount = (n: number) => {
    const count = Math.max(1, Math.min(50, n))
    const prev: (string | null)[] = editing.split_member_ids
    const next: (string | null)[] = []
    for (let i = 0; i < count; i++) {
      // Keep prior assignment, fill new slots with next available member or null
      next[i] = prev[i] !== undefined ? prev[i] : (members[i]?.id ?? null)
    }
    upd({ split_count: count, split_member_ids: next })
  }

  const setSlotMember = (idx: number, memberId: string | null) => {
    const next = [...editing.split_member_ids]
    next[idx] = memberId
    upd({ split_member_ids: next })
  }

  const sharePreview = editing.amount && editing.split_count
    ? Number(editing.amount) / editing.split_count
    : 0

  return (
    <form onSubmit={onSubmit} className="card-base p-4 border-brand-red mt-6 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs font-black tracking-[2px]">
          {editing.id ? t('exp.edit') : t('exp.add_new')}
        </div>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-gray-500">✗</button>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-pill">
        <button
          type="button"
          onClick={() => setMode('personal')}
          className={`text-[11px] font-black tracking-wider py-2 rounded-pill transition ${
            isPersonal ? 'bg-brand-black text-white' : 'text-gray-500'
          }`}
        >
          🍙 {lang === 'th' ? 'ส่วนตัว' : 'PERSONAL'}
        </button>
        <button
          type="button"
          onClick={() => setMode('shared')}
          className={`text-[11px] font-black tracking-wider py-2 rounded-pill transition ${
            !isPersonal ? 'bg-brand-black text-white' : 'text-gray-500'
          }`}
        >
          👥 {lang === 'th' ? 'หารกัน' : 'SHARED'}
        </button>
      </div>

      <label className="block">
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('exp.what')}</div>
        <input
          type="text" required maxLength={120}
          value={editing.description}
          onChange={e => upd({ description: e.target.value })}
          placeholder={t('exp.what_ph')}
          className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-2 block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('exp.amount')}</div>
          <input
            type="number" required min="0.01" step="0.01"
            value={editing.amount}
            onChange={e => upd({ amount: e.target.value })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-lg"
          />
        </label>
        <label className="block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('newtrip.curr')}</div>
          <select
            value={editing.currency}
            onChange={e => upd({ currency: e.target.value })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div>
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('exp.category')}</div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button
              key={c.id} type="button"
              onClick={() => upd({ category_id: c.id })}
              className={`text-xs font-bold px-2 py-1 rounded-pill border-2 ${
                editing.category_id === c.id
                  ? 'border-brand-black bg-brand-black text-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {c.icon} {pickCat(c, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-2 ${isPersonal ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {!isPersonal && (
          <label className="block">
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('exp.paid_by')}</div>
            <select
              value={editing.paid_by}
              onChange={e => upd({ paid_by: e.target.value })}
              className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-sm"
            >
              <option value="">—</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.user_profiles?.display_name || '?'}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('exp.date')}</div>
          <input
            type="date"
            value={editing.paid_at.slice(0, 10)}
            onChange={e => upd({ paid_at: e.target.value })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-sm"
          />
        </label>
      </div>

      {/* Split count + slot assignment — only in shared mode */}
      {isPersonal ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-3 text-center bg-gray-50">
          <div className="text-[11px] font-bold text-gray-500">
            {lang === 'th'
              ? '🍙 ค่าใช้จ่ายส่วนตัวของคุณ · ไม่หาร'
              : '🍙 Your personal spend · not split'}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600">
              {lang === 'th' ? 'หารกี่คน' : 'SPLIT COUNT'}
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setSplitCount(editing.split_count - 1)}
                className="w-7 h-7 rounded-full border-2 border-brand-black font-black">−</button>
              <span className="font-black text-lg w-8 text-center">{editing.split_count}</span>
              <button type="button" onClick={() => setSplitCount(editing.split_count + 1)}
                className="w-7 h-7 rounded-full border-2 border-brand-black font-black">+</button>
            </div>
          </div>
          <div className="space-y-1">
            {editing.split_member_ids.map((mid: string | null, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider text-gray-500 w-5">#{i + 1}</span>
                <select
                  value={mid || ''}
                  onChange={e => setSlotMember(i, e.target.value || null)}
                  className="flex-1 border border-gray-300 rounded-lg py-1.5 px-2 font-bold text-xs"
                >
                  <option value="">— {lang === 'th' ? 'ว่าง (ยังไม่มีคน)' : 'Open (no one yet)'} —</option>
                  {members
                    .filter(m => m.id === mid || !editing.split_member_ids.includes(m.id))
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.user_profiles?.display_name || '?'}</option>
                    ))}
                </select>
              </div>
            ))}
          </div>
          {sharePreview > 0 && (
            <div className="text-[10px] text-gray-500 font-bold mt-1.5">
              ↳ {formatCurrency(sharePreview, editing.currency)} {t('exp.each')}
            </div>
          )}
        </div>
      )}

      {/* Receipt upload */}
      <label className="block">
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">
          📷 {lang === 'th' ? 'ใบเสร็จ (ไม่จำเป็น)' : 'RECEIPT (optional)'}
          {editing.receipt_url && !editing.receipt_file && (
            <span className="ml-1.5 text-green-700">{lang === 'th' ? '· มีอยู่แล้ว' : '· already attached'}</span>
          )}
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={e => upd({ receipt_file: e.target.files?.[0] || null })}
          className="w-full text-xs font-bold border border-dashed border-gray-300 rounded-lg p-2"
        />
      </label>

      <label className="block">
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('exp.notes')}</div>
        <textarea
          rows={2}
          value={editing.notes}
          onChange={e => upd({ notes: e.target.value })}
          className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-sm"
        />
      </label>

      <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
        {saving ? t('edit.saving') : (editing.id ? t('exp.update') : t('exp.add'))}
      </button>
    </form>
  )
}
