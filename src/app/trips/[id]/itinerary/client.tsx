'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { LocationSearch } from '@/components/LocationSearch'

interface Activity {
  id: string
  type_id: string | null
  title: string
  description: string | null
  day_number: number | null
  start_at: string | null
  end_at: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  cost_amount: number | null
  cost_currency: string | null
  status: 'idea' | 'planned' | 'booked' | 'done' | 'cancelled'
  sort_order: number
}

interface ActivityType {
  id: string
  label_en: string
  label_th: string
  icon: string
  color: string
}

interface Props {
  tripId: string
  tripStart: string
  tripDays: number
  currency: string
  canEdit: boolean
  activities: Activity[]
  types: ActivityType[]
  lang: 'th' | 'en'
}

const pickLabel = (t: ActivityType | undefined, lang: 'th' | 'en') =>
  t ? (lang === 'th' ? t.label_th : t.label_en) : ''

const STATUS_LABELS: Record<Activity['status'], string> = {
  idea: 'IDEA',
  planned: 'PLANNED',
  booked: 'BOOKED',
  done: 'DONE',
  cancelled: 'CANCELLED',
}

const STATUS_COLORS: Record<Activity['status'], string> = {
  idea: 'bg-gray-100 text-gray-600',
  planned: 'bg-blue-50 text-blue-700',
  booked: 'bg-green-50 text-green-700',
  done: 'bg-brand-black text-white',
  cancelled: 'bg-red-50 text-brand-red line-through',
}

export function ItineraryClient(props: Props) {
  const { tripId, tripStart, tripDays, currency, canEdit, activities, types, lang } = props
  const router = useRouter()
  const supabase = createClient()

  const [editing, setEditing] = useState<Partial<Activity> | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const typesById = useMemo(() => Object.fromEntries(types.map(t => [t.id, t])), [types])

  // Group by day (null day → "UNSCHEDULED")
  const byDay = useMemo(() => {
    const map = new Map<number | null, Activity[]>()
    for (const a of activities) {
      const key = a.day_number ?? null
      const arr = map.get(key) ?? []
      arr.push(a)
      map.set(key, arr)
    }
    return map
  }, [activities])

  const days = Array.from({ length: tripDays }, (_, i) => i + 1)

  const startNew = (day: number | null) => {
    setEditing({
      id: undefined,
      title: '',
      day_number: day,
      status: 'planned',
      type_id: 'sightseeing',
      cost_currency: currency,
    })
    setError('')
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing?.title?.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      trip_id: tripId,
      title: editing.title.trim(),
      type_id: editing.type_id || null,
      day_number: editing.day_number ?? null,
      start_at: editing.start_at || null,
      end_at: editing.end_at || null,
      location_name: editing.location_name?.trim() || null,
      latitude:  editing.latitude  ?? null,
      longitude: editing.longitude ?? null,
      cost_amount: editing.cost_amount ? Number(editing.cost_amount) : null,
      cost_currency: editing.cost_currency || currency,
      status: editing.status || 'planned',
      description: editing.description?.trim() || null,
    }

    const { error: err } = editing.id
      ? await supabase.from('activities').update(payload).eq('id', editing.id)
      : await supabase.from('activities').insert(payload)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    setEditing(null)
    setSaving(false)
    router.refresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this activity?')) return
    await supabase.from('activities').delete().eq('id', id)
    router.refresh()
  }

  const setStatus = async (id: string, status: Activity['status']) => {
    await supabase.from('activities').update({ status }).eq('id', id)
    router.refresh()
  }

  const dayLabel = (day: number) => {
    const d = new Date(tripStart)
    d.setDate(d.getDate() + day - 1)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Tokyo' }).toUpperCase()
  }

  return (
    <>
      {error && (
        <div className="text-sm font-bold p-3 rounded-xl border-2 bg-red-50 border-brand-red text-brand-red mb-4">
          {error}
        </div>
      )}

      {/* Edit form (inline modal-ish) */}
      {editing && (
        <ActivityForm
          editing={editing}
          types={types}
          tripDays={tripDays}
          saving={saving}
          lang={lang}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSubmit={save}
        />
      )}

      {/* Day sections */}
      {days.map(day => {
        const list = byDay.get(day) || []
        return (
          <DaySection
            key={day}
            title={`DAY ${day}`}
            subtitle={dayLabel(day)}
            activities={list}
            typesById={typesById}
            canEdit={canEdit}
            onAdd={() => startNew(day)}
            onEdit={a => setEditing(a)}
            onDelete={remove}
            onStatus={setStatus}
          />
        )
      })}

      {/* Unscheduled */}
      {(byDay.get(null)?.length || 0) > 0 && (
        <DaySection
          title="UNSCHEDULED"
          subtitle="No day assigned"
          activities={byDay.get(null) || []}
          typesById={typesById}
          canEdit={canEdit}
          onAdd={() => startNew(null)}
          onEdit={a => setEditing(a)}
          onDelete={remove}
          onStatus={setStatus}
        />
      )}

      {canEdit && !editing && (
        <button onClick={() => startNew(null)} className="btn-dashed w-full mt-6">
          ＋ ADD UNSCHEDULED IDEA
        </button>
      )}
    </>
  )
}

// ===== Day section =====

function DaySection({ title, subtitle, activities, typesById, canEdit, onAdd, onEdit, onDelete, onStatus }: {
  title: string
  subtitle: string
  activities: Activity[]
  typesById: Record<string, ActivityType>
  canEdit: boolean
  onAdd: () => void
  onEdit: (a: Activity) => void
  onDelete: (id: string) => void
  onStatus: (id: string, status: Activity['status']) => void
}) {
  return (
    <section className="mt-6">
      <div className="flex justify-between items-baseline mb-2">
        <div>
          <div className="text-xs font-black uppercase tracking-[2px]">{title}</div>
          <div className="text-[10px] text-gray-500 font-bold tracking-wider">{subtitle}</div>
        </div>
        {canEdit && (
          <button onClick={onAdd} className="text-[10px] font-black tracking-[2px] text-brand-red">
            ＋ ADD
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-xs">— nothing yet —</div>
      ) : (
        <div className="space-y-2">
          {activities.map(a => (
            <ActivityCard
              key={a.id}
              activity={a}
              type={a.type_id ? typesById[a.type_id] : undefined}
              canEdit={canEdit}
              onEdit={() => onEdit(a)}
              onDelete={() => onDelete(a.id)}
              onStatus={s => onStatus(a.id, s)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ===== Activity card =====

function ActivityCard({ activity, type, canEdit, onEdit, onDelete, onStatus }: {
  activity: Activity
  type?: ActivityType
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onStatus: (s: Activity['status']) => void
}) {
  const time = activity.start_at ? new Date(activity.start_at).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  }) : null

  return (
    <div className="card-base p-3">
      <div className="flex items-start gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ backgroundColor: (type?.color || '#1A1A1A') + '20' }}
        >
          {type?.icon || '📌'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-black text-sm leading-tight min-w-0">
              {activity.title}
            </div>
            <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLORS[activity.status]}`}>
              {STATUS_LABELS[activity.status]}
            </span>
          </div>

          {(time || activity.location_name) && (
            <div className="text-[11px] text-gray-600 font-bold mt-0.5 flex items-center gap-1 flex-wrap">
              {time && <span>{time}</span>}
              {time && activity.location_name && <span className="text-gray-300">·</span>}
              {activity.location_name && (
                activity.latitude && activity.longitude ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-red underline-offset-2 hover:underline no-underline"
                    onClick={e => e.stopPropagation()}
                  >
                    📍 {activity.location_name}
                  </a>
                ) : (
                  <span>{activity.location_name}</span>
                )
              )}
            </div>
          )}

          {activity.cost_amount && (
            <div className="text-[11px] font-black mt-0.5">
              {formatCurrency(Number(activity.cost_amount), activity.cost_currency || 'THB')}
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-between items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <select
            value={activity.status}
            onChange={e => onStatus(e.target.value as Activity['status'])}
            className="text-[10px] font-bold border border-gray-200 rounded px-1.5 py-1"
          >
            <option value="idea">Idea</option>
            <option value="planned">Planned</option>
            <option value="booked">Booked</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="flex gap-1">
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
        </div>
      )}
    </div>
  )
}

// ===== Form =====

function ActivityForm({ editing, types, tripDays, saving, lang, onChange, onCancel, onSubmit }: {
  editing: Partial<Activity>
  types: ActivityType[]
  tripDays: number
  saving: boolean
  lang: 'th' | 'en'
  onChange: (a: Partial<Activity>) => void
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const upd = (patch: Partial<Activity>) => onChange({ ...editing, ...patch })

  return (
    <form onSubmit={onSubmit} className="card-base p-4 border-brand-red mb-6 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs font-black tracking-[2px]">
          {editing.id ? 'EDIT ACTIVITY' : '＋ NEW ACTIVITY'}
        </div>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-gray-500">✗</button>
      </div>

      <div>
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">TYPE</div>
        <div className="flex flex-wrap gap-1.5">
          {types.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => upd({ type_id: t.id })}
              className={`text-xs font-bold px-2 py-1 rounded-pill border-2 ${
                editing.type_id === t.id
                  ? 'border-brand-black bg-brand-black text-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {t.icon} {pickLabel(t, lang)}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">TITLE *</div>
        <input
          type="text"
          required
          maxLength={120}
          value={editing.title || ''}
          onChange={e => upd({ title: e.target.value })}
          placeholder="e.g. Sushi at Tsukiji"
          className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">DAY</div>
          <select
            value={editing.day_number ?? ''}
            onChange={e => upd({ day_number: e.target.value ? Number(e.target.value) : null })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-xs"
          >
            <option value="">—</option>
            {Array.from({ length: tripDays }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>Day {d}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">START</div>
          <input
            type="time"
            value={editing.start_at ? new Date(editing.start_at).toTimeString().slice(0, 5) : ''}
            onChange={e => {
              if (!e.target.value) return upd({ start_at: null })
              const today = new Date()
              today.setHours(Number(e.target.value.split(':')[0]), Number(e.target.value.split(':')[1]), 0, 0)
              upd({ start_at: today.toISOString() })
            }}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-xs"
          />
        </label>
        <label className="block">
          <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">STATUS</div>
          <select
            value={editing.status || 'planned'}
            onChange={e => upd({ status: e.target.value as Activity['status'] })}
            className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-xs"
          >
            <option value="idea">Idea</option>
            <option value="planned">Planned</option>
            <option value="booked">Booked</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancel</option>
          </select>
        </label>
      </div>

      <div>
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">
          {lang === 'th' ? 'สถานที่ (ค้นหา)' : 'LOCATION (search)'}
          {editing.latitude && editing.longitude && (
            <span className="ml-1.5 text-[9px] text-green-600">
              📍 {Number(editing.latitude).toFixed(3)}, {Number(editing.longitude).toFixed(3)}
            </span>
          )}
        </div>
        <LocationSearch
          value={editing.location_name || ''}
          onChange={text => upd({ location_name: text, latitude: null, longitude: null })}
          onPick={({ name, lat, lng }) => upd({ location_name: name, latitude: lat, longitude: lng })}
          placeholder={lang === 'th' ? 'เช่น Shibuya, Tsukiji Outer Market' : 'e.g. Shibuya, Tsukiji Outer Market'}
          disabled={saving}
          lang={lang}
          className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold"
        />
      </div>

      <label className="block">
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">COST (optional)</div>
        <input
          type="number"
          min="0"
          step="0.01"
          value={editing.cost_amount || ''}
          onChange={e => upd({ cost_amount: e.target.value ? Number(e.target.value) : null })}
          placeholder="0"
          className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold"
        />
      </label>

      <label className="block">
        <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">NOTES</div>
        <textarea
          rows={2}
          value={editing.description || ''}
          onChange={e => upd({ description: e.target.value })}
          placeholder="Reservation, link, etc."
          className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-sm"
        />
      </label>

      <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
        {saving ? 'SAVING...' : (editing.id ? 'UPDATE' : 'CREATE')}
      </button>
    </form>
  )
}
