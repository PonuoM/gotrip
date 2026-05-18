'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { t as translate, type TKey } from '@/lib/i18n'

interface Tick {
  member_id: string
  ticked_at: string
}

interface Item {
  id: string
  title: string
  description: string | null
  member_id: string | null
  is_done: boolean
  sort_order: number
  checklist_item_ticks: Tick[]
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
  myMemberId: string
  checklists: Checklist[]
  members: Member[]
  lang: 'th' | 'en'
}

export function ChecklistClient({ tripId, canEdit, myMemberId, checklists, members, lang }: Props) {
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
              myMemberId={myMemberId}
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

function ChecklistCard({ list, members, memberMap, myMemberId, canEdit, lang, onDelete }: {
  list: Checklist
  members: Member[]
  memberMap: Record<string, string>
  myMemberId: string
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

  // "Fully done" =
  //   - specific item: is_done (single owner)
  //   - shared item: every approved member has ticked
  const totalMembers = members.length
  const isItemFullyDone = (item: Item): boolean => {
    if (item.member_id) return item.is_done
    return totalMembers > 0 && item.checklist_item_ticks.length >= totalMembers
  }

  const sorted = [...list.checklist_items].sort((a, b) => {
    const ad = isItemFullyDone(a), bd = isItemFullyDone(b)
    if (ad !== bd) return ad ? 1 : -1
    return a.sort_order - b.sort_order
  })

  const doneCount = list.checklist_items.filter(isItemFullyDone).length
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

  // Specific item: toggle is_done (only the assigned person should hit this)
  const toggleSpecific = async (item: Item) => {
    await supabase
      .from('checklist_items')
      .update({
        is_done: !item.is_done,
        done_at: item.is_done ? null : new Date().toISOString(),
      })
      .eq('id', item.id)
    router.refresh()
  }

  // Shared item: toggle current user's own tick (insert or delete)
  const toggleMyTick = async (item: Item) => {
    const mine = item.checklist_item_ticks.find(tk => tk.member_id === myMemberId)
    if (mine) {
      await supabase
        .from('checklist_item_ticks')
        .delete()
        .eq('item_id', item.id)
        .eq('member_id', myMemberId)
    } else {
      await supabase
        .from('checklist_item_ticks')
        .insert({ item_id: item.id, member_id: myMemberId })
    }
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
      <div className="space-y-2">
        {sorted.map(item => {
          const fullyDone = isItemFullyDone(item)
          const isShared = !item.member_id
          const myTicked = isShared && item.checklist_item_ticks.some(tk => tk.member_id === myMemberId)
          return (
            <div
              key={item.id}
              className={`flex items-start gap-2 py-1.5 ${fullyDone ? 'opacity-60' : ''}`}
            >
              {isShared ? (
                /* Shared item — current user toggles their own tick */
                <button
                  onClick={() => toggleMyTick(item)}
                  className={`shrink-0 w-5 h-5 rounded-full border-2 border-brand-black flex items-center justify-center text-[10px] font-black ${
                    myTicked ? 'bg-brand-red text-white' : 'bg-white'
                  }`}
                  title={lang === 'th' ? 'ติ๊กของฉัน' : 'My tick'}
                >
                  {myTicked && '✓'}
                </button>
              ) : (
                /* Specific item — assigned person checks once */
                <button
                  onClick={() => toggleSpecific(item)}
                  className={`shrink-0 w-5 h-5 rounded border-2 border-brand-black flex items-center justify-center text-[10px] font-black ${
                    item.is_done ? 'bg-brand-black text-white' : 'bg-white'
                  }`}
                >
                  {item.is_done && '✓'}
                </button>
              )}

              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold ${fullyDone ? 'line-through' : ''}`}>
                  {item.title}
                </div>
                {item.member_id && (
                  <div className="text-[10px] text-brand-red font-bold">
                    @ {memberMap[item.member_id] || '?'}
                  </div>
                )}
                {/* Avatar pile for shared items */}
                {isShared && (
                  <div className="flex -space-x-1.5 mt-1">
                    {members.map(m => {
                      const ticked = item.checklist_item_ticks.some(tk => tk.member_id === m.id)
                      const name = m.user_profiles?.display_name || '?'
                      const initial = name[0]?.toUpperCase() || '?'
                      const isMine = m.id === myMemberId
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => isMine && toggleMyTick(item)}
                          disabled={!isMine}
                          title={name + (ticked ? ' ✓' : '')}
                          className={`relative w-6 h-6 rounded-full border-2 border-white text-[10px] font-black flex items-center justify-center transition ${
                            ticked
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-500'
                          } ${isMine ? 'ring-2 ring-brand-red' : ''}`}
                        >
                          {ticked ? '✓' : initial}
                        </button>
                      )
                    })}
                    <div className="ml-3 text-[10px] text-gray-500 font-bold self-center pl-1">
                      {item.checklist_item_ticks.length}/{totalMembers}
                    </div>
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
          )
        })}
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
