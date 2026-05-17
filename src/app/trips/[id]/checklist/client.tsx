'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { t as translate, type TKey } from '@/lib/i18n'

interface Item {
  id: string
  title: string
  description: string | null
  member_id: string | null
  is_done: boolean
  sort_order: number
}

interface Checklist {
  id: string
  title: string
  is_shared: boolean
  created_at: string
  checklist_items: Item[]
}

interface Member {
  id: string
  user_profiles: { display_name: string } | null
}

interface Props {
  tripId: string
  canEdit: boolean
  checklists: Checklist[]
  members: Member[]
  lang: 'th' | 'en'
}

export function ChecklistClient({ tripId, canEdit, checklists, members, lang }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const t = (k: TKey) => translate(lang, k)

  const [newListTitle, setNewListTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const memberMap = Object.fromEntries(members.map(m => [m.id, m.user_profiles?.display_name || '?']))

  const createList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListTitle.trim()) return
    setCreating(true)
    setError('')
    const { error } = await supabase.from('checklists').insert({
      trip_id: tripId,
      title: newListTitle.trim(),
    })
    if (error) setError(error.message)
    else {
      setNewListTitle('')
      router.refresh()
    }
    setCreating(false)
  }

  const deleteList = async (id: string) => {
    if (!confirm(t('cl.delete_list'))) return
    await supabase.from('checklists').delete().eq('id', id)
    router.refresh()
  }

  return (
    <>
      {error && (
        <div className="text-sm font-bold p-3 rounded-xl border-2 bg-red-50 border-brand-red text-brand-red mb-4">
          {error}
        </div>
      )}

      {canEdit && (
        <form onSubmit={createList} className="card-base p-3 mb-6 flex gap-2">
          <input
            type="text"
            placeholder={t('cl.new_title')}
            value={newListTitle}
            onChange={e => setNewListTitle(e.target.value)}
            className="flex-1 border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-sm"
            maxLength={60}
          />
          <button
            type="submit"
            disabled={creating || !newListTitle.trim()}
            className="bg-brand-red text-white text-xs font-black px-4 rounded-pill border-2 border-brand-black disabled:opacity-50"
          >
            ＋ {t('btn.add')}
          </button>
        </form>
      )}

      {checklists.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {t('cl.no_lists')}
          {canEdit && <div className="mt-1 text-xs">{t('cl.create_above')}</div>}
        </div>
      ) : (
        <div className="space-y-6">
          {checklists.map(list => (
            <ChecklistCard
              key={list.id}
              list={list}
              members={members}
              memberMap={memberMap}
              canEdit={canEdit}
              lang={lang}
              onDelete={() => deleteList(list.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ===== Checklist card =====

function ChecklistCard({ list, members, memberMap, canEdit, lang, onDelete }: {
  list: Checklist
  members: Member[]
  memberMap: Record<string, string>
  canEdit: boolean
  lang: 'th' | 'en'
  onDelete: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const t = (k: TKey) => translate(lang, k)

  const [newItem, setNewItem] = useState('')
  const [assignTo, setAssignTo] = useState<string>('')
  const [adding, setAdding] = useState(false)

  const sorted = [...list.checklist_items].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1
    return a.sort_order - b.sort_order
  })

  const doneCount = list.checklist_items.filter(i => i.is_done).length
  const total = list.checklist_items.length
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    setAdding(true)
    const { error } = await supabase.from('checklist_items').insert({
      checklist_id: list.id,
      title: newItem.trim(),
      member_id: assignTo || null,
      sort_order: total,
    })
    if (!error) {
      setNewItem('')
      router.refresh()
    }
    setAdding(false)
  }

  const toggleItem = async (item: Item) => {
    await supabase
      .from('checklist_items')
      .update({
        is_done: !item.is_done,
        done_at: item.is_done ? null : new Date().toISOString(),
      })
      .eq('id', item.id)
    router.refresh()
  }

  const deleteItem = async (id: string) => {
    await supabase.from('checklist_items').delete().eq('id', id)
    router.refresh()
  }

  return (
    <section className="card-base p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-black text-base">{list.title.toUpperCase()}</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-wider">
            {doneCount}/{total} {t('cl.done')} · {pct}%
          </div>
        </div>
        {canEdit && (
          <button
            onClick={onDelete}
            className="text-[10px] font-black tracking-wider text-gray-400 hover:text-brand-red px-2 py-1"
          >
            ✗
          </button>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-brand-red transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Items */}
      <div className="space-y-1">
        {sorted.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-2 py-1.5 ${item.is_done ? 'opacity-50' : ''}`}
          >
            <button
              onClick={() => toggleItem(item)}
              className={`shrink-0 w-5 h-5 rounded border-2 border-brand-black flex items-center justify-center text-[10px] font-black ${
                item.is_done ? 'bg-brand-black text-white' : 'bg-white'
              }`}
            >
              {item.is_done && '✓'}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold ${item.is_done ? 'line-through' : ''}`}>
                {item.title}
              </div>
              {item.member_id && (
                <div className="text-[10px] text-brand-red font-bold">
                  @ {memberMap[item.member_id] || '?'}
                </div>
              )}
            </div>
            {canEdit && (
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-300 hover:text-brand-red text-xs px-1"
              >
                ✗
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add item */}
      {canEdit && (
        <form onSubmit={addItem} className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder={t('cl.add_item')}
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              maxLength={120}
              className="flex-1 border border-gray-300 rounded-lg py-1.5 px-2 text-sm font-bold"
            />
            <select
              value={assignTo}
              onChange={e => setAssignTo(e.target.value)}
              className="border border-gray-300 rounded-lg py-1.5 px-1 text-[10px] font-bold max-w-[80px]"
            >
              <option value="">{t('cl.all_chip')}</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.user_profiles?.display_name || '?'}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={adding || !newItem.trim()}
              className="bg-brand-black text-white text-xs font-black px-3 rounded-pill disabled:opacity-50"
            >
              ＋
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
