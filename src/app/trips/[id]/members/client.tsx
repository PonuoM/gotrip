'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { t as translate, type TKey } from '@/lib/i18n'
import { AvatarBadge } from '@/components/AvatarBadge'
import { confirmDialog } from '@/lib/dialog'

interface Props {
  tripId: string
  isOwner: boolean
  currentUserId: string
  approved: any[]
  pending: any[]
  invites: any[]
  lang: 'th' | 'en'
}

export function MembersClient({ tripId, isOwner, currentUserId, approved, pending, invites, lang }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const t = (k: TKey) => translate(lang, k)

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const approve = async (memberId: string) => {
    setBusy(memberId)
    setError('')
    const { error } = await supabase.rpc('approve_trip_member', { p_member_id: memberId })
    if (error) setError(error.message)
    else router.refresh()
    setBusy(null)
  }

  const reject = async (memberId: string) => {
    const ok = await confirmDialog({
      title: lang === 'th' ? 'ปฏิเสธคำขอ' : 'Reject request',
      message: t('mem.reject'),
      confirmLabel: lang === 'th' ? 'ปฏิเสธ' : 'REJECT',
      danger: true,
    })
    if (!ok) return
    setBusy(memberId)
    setError('')
    const { error } = await supabase.from('trip_members').delete().eq('id', memberId)
    if (error) setError(error.message)
    else router.refresh()
    setBusy(null)
  }

  const changeRole = async (memberId: string, role: 'editor' | 'viewer') => {
    setBusy(memberId)
    setError('')
    const { error } = await supabase.from('trip_members').update({ role }).eq('id', memberId)
    if (error) setError(error.message)
    else router.refresh()
    setBusy(null)
  }

  const removeMember = async (memberId: string, name: string) => {
    const ok = await confirmDialog({
      title: lang === 'th' ? 'ลบสมาชิก' : 'Remove member',
      message: lang === 'th'
        ? `ลบ ${name} ออกจากทริปนี้? เขาจะสูญเสียสิทธิ์เข้าถึง`
        : `Remove ${name} from this trip? They will lose access.`,
      confirmLabel: lang === 'th' ? 'ลบออก' : 'REMOVE',
      danger: true,
    })
    if (!ok) return
    setBusy(memberId)
    setError('')
    const { error } = await supabase.from('trip_members').delete().eq('id', memberId)
    if (error) setError(error.message)
    else router.refresh()
    setBusy(null)
  }

  return (
    <>
      {error && (
        <div className="text-sm font-bold p-3 rounded-xl border-2 bg-red-50 border-brand-red text-brand-red mb-4">
          {error}
        </div>
      )}

      {/* Pending requests — owner only */}
      {isOwner && pending.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-[2px]">{t('mem.pending')}</span>
            <span className="bg-brand-red text-white text-[10px] font-black px-2 py-0.5 rounded-pill">
              {pending.length}
            </span>
          </div>
          <div className="space-y-2">
            {pending.map(m => (
              <div key={m.id} className="card-base p-3 border-brand-red">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AvatarBadge
                      animal={m.user_profiles?.avatar_animal}
                      bgColor={m.user_profiles?.avatar_bg_color || '#9CA3AF'}
                      fallbackLetter={m.user_profiles?.display_name?.[0]}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="font-black text-sm truncate">
                        {m.user_profiles?.display_name || 'Unknown'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold">
                        {t('mem.wants_join')} · {m.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => approve(m.id)}
                      disabled={busy === m.id}
                      className="bg-brand-red text-white text-[10px] font-black px-3 py-2 rounded-pill border-2 border-brand-black disabled:opacity-50"
                    >
                      ✓ OK
                    </button>
                    <button
                      onClick={() => reject(m.id)}
                      disabled={busy === m.id}
                      className="bg-white text-gray-500 text-[10px] font-black px-3 py-2 rounded-pill border-2 border-gray-300 disabled:opacity-50"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Approved members */}
      <section className="mb-6">
        <div className="text-xs font-black uppercase tracking-[2px] mb-3">
          {t('mem.approved')} · {approved.length}
        </div>
        <div className="space-y-2">
          {approved.map(m => {
            const name = m.user_profiles?.display_name || 'Unknown'
            const isSelf = m.user_id === currentUserId
            const isMemberOwner = m.role === 'owner'
            const canManage = isOwner && !isSelf && !isMemberOwner
            return (
              <div key={m.id} className="card-base p-3">
                <div className="flex items-center gap-2">
                  <AvatarBadge
                    animal={m.user_profiles?.avatar_animal}
                    bgColor={m.user_profiles?.avatar_bg_color}
                    fallbackLetter={name[0]}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">
                      {name}{isSelf && ` ${t('mem.you')}`}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold tracking-wider">
                      {m.role.toUpperCase()} · {t('mem.joined')} {formatDate(m.joined_at)}
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
                    <select
                      value={m.role}
                      onChange={e => changeRole(m.id, e.target.value as 'editor' | 'viewer')}
                      disabled={busy === m.id}
                      className="text-[10px] font-bold border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => removeMember(m.id, name)}
                      disabled={busy === m.id}
                      className="text-[10px] font-black tracking-wider text-brand-red border border-brand-red/30 rounded-pill px-2 py-1 disabled:opacity-50"
                    >
                      {t('mem.remove')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Invite generator + active links — owner only */}
      {isOwner && (
        <InviteSection tripId={tripId} invites={invites} lang={lang} />
      )}
    </>
  )
}

function InviteSection({ tripId, invites, lang }: { tripId: string; invites: any[]; lang: 'th' | 'en' }) {
  const router = useRouter()
  const supabase = createClient()
  const t = (k: TKey) => translate(lang, k)

  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [maxUses, setMaxUses] = useState('5')
  const [expiresInDays, setExpiresInDays] = useState('7')
  const [creating, setCreating] = useState(false)
  const [createdCode, setCreatedCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setCreatedCode('')

    const code = nanoid(10)
    const expires_at = expiresInDays
      ? new Date(Date.now() + Number(expiresInDays) * 86400_000).toISOString()
      : null

    const { error } = await supabase.from('trip_invites').insert({
      trip_id: tripId,
      code,
      role,
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at,
    })

    if (error) setError(error.message)
    else {
      setCreatedCode(code)
      router.refresh()
    }
    setCreating(false)
  }

  const handleRevoke = async (id: string) => {
    const ok = await confirmDialog({
      title: lang === 'th' ? 'ยกเลิกลิงก์' : 'Revoke invite',
      message: t('mem.revoke'),
      confirmLabel: lang === 'th' ? 'ยกเลิก' : 'REVOKE',
      danger: true,
    })
    if (!ok) return
    await supabase.from('trip_invites').delete().eq('id', id)
    router.refresh()
  }

  const inviteUrl = (code: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/join/${code}` : `/join/${code}`

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(inviteUrl(code))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section>
      <div className="text-xs font-black uppercase tracking-[2px] mb-3">
        {t('mem.invite_links')}
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="card-base p-4 mb-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('mem.role')}</div>
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-xs"
            >
              <option value="editor">{lang === 'th' ? 'แก้ไขได้' : 'Editor'}</option>
              <option value="viewer">{lang === 'th' ? 'ดูอย่างเดียว' : 'Viewer'}</option>
            </select>
          </label>
          <label className="block">
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('mem.max_uses')}</div>
            <input
              type="number"
              min="1"
              max="50"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              placeholder="∞"
              className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-xs"
            />
          </label>
          <label className="block">
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">{t('mem.days')}</div>
            <input
              type="number"
              min="1"
              max="365"
              value={expiresInDays}
              onChange={e => setExpiresInDays(e.target.value)}
              className="w-full border-2 border-brand-black rounded-lg py-2 px-2 font-bold text-xs"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="btn-primary w-full disabled:opacity-50"
        >
          {creating ? t('mem.creating') : t('mem.create_link')}
        </button>

        {error && (
          <div className="text-xs font-bold text-brand-red">{error}</div>
        )}

        {createdCode && (
          <div className="mt-3 p-3 bg-brand-black text-white rounded-xl">
            <div className="text-[9px] font-black tracking-[1.5px] opacity-70 mb-1">
              {t('mem.link_created')}
            </div>
            <div className="font-mono text-xs break-all mb-2 selectable">{inviteUrl(createdCode)}</div>
            <button
              type="button"
              onClick={() => copy(createdCode)}
              className="bg-brand-red text-white text-[10px] font-black px-3 py-1.5 rounded-pill border-2 border-white"
            >
              {copied ? t('mem.copied') : t('mem.copy')}
            </button>
          </div>
        )}
      </form>

      {/* Active invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold tracking-[2px] text-gray-500">
            {t('mem.active_links')}
          </div>
          {invites.map(inv => {
            const expired = inv.expires_at && new Date(inv.expires_at) < new Date()
            const full = inv.max_uses && inv.used_count >= inv.max_uses
            const dead = expired || full
            return (
              <div key={inv.id} className={`card-base p-3 ${dead ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs truncate font-bold selectable">
                      /join/{inv.code}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                      {inv.role.toUpperCase()}
                      {' · '}
                      {inv.used_count}/{inv.max_uses ?? '∞'} {t('mem.used')}
                      {inv.expires_at && (
                        <> · {expired ? t('mem.expired') : `${t('mem.expires')} ${formatDate(inv.expires_at)}`}</>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!dead && (
                      <button
                        onClick={() => copy(inv.code)}
                        className="text-[10px] font-black px-2 py-1.5 rounded-pill border-2 border-brand-black"
                      >
                        {t('mem.copy_short')}
                      </button>
                    )}
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="text-[10px] font-black px-2 py-1.5 rounded-pill border-2 border-gray-300 text-gray-500"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
