'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { t as translate, type TKey } from '@/lib/i18n'

interface Doc {
  id: string
  filename: string
  display_name: string | null
  description: string | null
  group_id: string | null
  file_url: string
  file_size: number | null
  mime_type: string | null
  category: 'ticket' | 'hotel' | 'insurance' | 'id' | 'receipt' | 'other'
  uploaded_at: string
  uploaded_by: string | null
}

interface Props {
  tripId: string
  canEdit: boolean
  documents: Doc[]
  lang: 'th' | 'en'
}

const CATEGORIES: { id: Doc['category']; key: TKey; icon: string }[] = [
  { id: 'ticket',    key: 'docs.cat_ticket',    icon: '🎫' },
  { id: 'hotel',     key: 'docs.cat_hotel',     icon: '🏨' },
  { id: 'insurance', key: 'docs.cat_insurance', icon: '🛡️' },
  { id: 'id',        key: 'docs.cat_id',        icon: '🪪' },
  { id: 'receipt',   key: 'docs.cat_receipt',   icon: '🧾' },
  { id: 'other',     key: 'docs.cat_other',     icon: '📎' },
]

const ICON_BY_CAT: Record<Doc['category'], string> = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c.icon])
) as any

function formatBytes(n: number | null): string {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function DocsClient({ tripId, canEdit, documents, lang }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const t = (k: TKey) => translate(lang, k)

  // Upload form state
  const [files, setFiles] = useState<File[]>([])
  const [docName, setDocName] = useState('')
  const [docDesc, setDocDesc] = useState('')
  const [category, setCategory] = useState<Doc['category']>('ticket')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  // Edit state
  const [editing, setEditing] = useState<{ groupKey: string; name: string; description: string } | null>(null)

  // Group documents: by group_id, fallback to single
  const groups = useMemo(() => {
    const map = new Map<string, Doc[]>()
    for (const d of documents) {
      const key = d.group_id || d.id  // group key — fallback to doc id for ungrouped
      const arr = map.get(key) ?? []
      arr.push(d)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [documents])

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      setError(t('docs.pick_first'))
      return
    }
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        setError(`${f.name}: ${t('docs.too_big')}`)
        return
      }
    }

    setUploading(true)
    setError('')
    setProgress(t('docs.uploading'))

    // If multi-file, generate one group_id
    const groupId = files.length > 1 ? crypto.randomUUID() : null
    const displayName = docName.trim() || files[0].name
    const description = docDesc.trim() || null

    const uploadedKeys: string[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'bin'
      const key = `${tripId}/${crypto.randomUUID()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('trip-documents')
        .upload(key, file, {
          cacheControl: '3600',
          contentType: file.type || 'application/octet-stream',
        })

      if (upErr) {
        // Rollback any successful uploads
        if (uploadedKeys.length > 0) {
          await supabase.storage.from('trip-documents').remove(uploadedKeys)
        }
        setError(upErr.message)
        setUploading(false)
        setProgress('')
        return
      }
      uploadedKeys.push(key)
    }

    setProgress(t('docs.saving'))

    const rows = files.map((file, i) => ({
      trip_id: tripId,
      filename: file.name,
      display_name: displayName,
      description,
      group_id: groupId,
      file_url: uploadedKeys[i],
      file_size: file.size,
      mime_type: file.type || null,
      category,
    }))

    const { error: dbErr } = await supabase.from('documents').insert(rows)
    if (dbErr) {
      await supabase.storage.from('trip-documents').remove(uploadedKeys)
      setError(dbErr.message)
      setUploading(false)
      setProgress('')
      return
    }

    setFiles([])
    setDocName('')
    setDocDesc('')
    setProgress('')
    setUploading(false)
    router.refresh()
  }

  const download = async (doc: Doc) => {
    const { data, error } = await supabase.storage
      .from('trip-documents')
      .createSignedUrl(doc.file_url, 60)
    if (error || !data) {
      alert(error?.message || 'Could not generate link')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const removeDoc = async (doc: Doc) => {
    const confirmMsg = lang === 'th' ? `ลบ "${doc.filename}"?` : `Delete "${doc.filename}"?`
    if (!confirm(confirmMsg)) return
    await supabase.storage.from('trip-documents').remove([doc.file_url])
    await supabase.from('documents').delete().eq('id', doc.id)
    router.refresh()
  }

  const removeGroup = async (docs: Doc[]) => {
    const groupName = docs[0]?.display_name || docs[0]?.filename || ''
    const confirmMsg = lang === 'th'
      ? `ลบทั้งกลุ่ม "${groupName}" (${docs.length} ไฟล์)?`
      : `Delete entire group "${groupName}" (${docs.length} files)?`
    if (!confirm(confirmMsg)) return
    await supabase.storage.from('trip-documents').remove(docs.map(d => d.file_url))
    await supabase.from('documents').delete().in('id', docs.map(d => d.id))
    router.refresh()
  }

  const saveEdit = async (docs: Doc[]) => {
    if (!editing) return
    // Update display_name + description for all docs in group
    await supabase
      .from('documents')
      .update({
        display_name: editing.name.trim() || null,
        description: editing.description.trim() || null,
      })
      .in('id', docs.map(d => d.id))
    setEditing(null)
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
        <form onSubmit={upload} className="card-base p-4 mb-6 space-y-3">
          <div className="text-xs font-black tracking-[2px]">{t('docs.upload')}</div>

          <div>
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1.5">{t('docs.category')}</div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`text-xs font-bold px-2 py-1 rounded-pill border-2 ${
                    category === c.id
                      ? 'border-brand-black bg-brand-black text-white'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {c.icon} {t(c.key)}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">
              {lang === 'th' ? 'ชื่อ (ไม่จำเป็น)' : 'NAME (optional)'}
            </div>
            <input
              type="text"
              maxLength={80}
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder={lang === 'th' ? 'เช่น Aoyu Hotel, ตั๋ว XJ612' : 'e.g. Aoyu Hotel, XJ612 ticket'}
              className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-sm"
            />
          </label>

          <label className="block">
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1">
              {lang === 'th' ? 'คำอธิบาย (ไม่จำเป็น)' : 'DESCRIPTION (optional)'}
            </div>
            <textarea
              rows={2}
              maxLength={300}
              value={docDesc}
              onChange={e => setDocDesc(e.target.value)}
              placeholder={lang === 'th' ? 'รายละเอียดเพิ่มเติม, room#, booking ref...' : 'Notes, room #, booking ref...'}
              className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-sm"
            />
          </label>

          <label className="block">
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1.5">
              {lang === 'th' ? 'ไฟล์ (เลือกได้หลายไฟล์ · สูงสุด 10MB/ไฟล์)' : t('docs.file') + ' · multi-select OK'}
            </div>
            <input
              type="file"
              multiple
              onChange={e => setFiles(Array.from(e.target.files || []))}
              accept="image/*,application/pdf"
              className="w-full text-xs font-bold border-2 border-dashed border-gray-300 rounded-lg p-3"
            />
          </label>

          {files.length > 0 && (
            <div className="text-[11px] text-gray-500 font-bold space-y-0.5">
              <div>{files.length} {lang === 'th' ? 'ไฟล์ที่เลือก:' : 'files selected:'}</div>
              {files.slice(0, 5).map((f, i) => (
                <div key={i} className="truncate">• {f.name} ({formatBytes(f.size)})</div>
              ))}
              {files.length > 5 && <div>… +{files.length - 5} more</div>}
            </div>
          )}

          {progress && (
            <div className="text-xs text-brand-red font-bold">{progress}</div>
          )}

          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="btn-primary w-full disabled:opacity-50"
          >
            {uploading ? (t('docs.uploading')).toUpperCase() : t('docs.upload_btn')}
          </button>
        </form>
      )}

      {/* List */}
      <div className="text-xs font-black uppercase tracking-[2px] mb-3">
        {t('docs.all_files')} · {groups.length}
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {t('docs.no_files')}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(([groupKey, docs]) => {
            const first = docs[0]
            const isGroup = docs.length > 1 || !!first.group_id
            const isEditing = editing?.groupKey === groupKey
            return (
              <div key={groupKey} className="card-base p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      maxLength={80}
                      value={editing.name}
                      onChange={e => setEditing({ ...editing, name: e.target.value })}
                      placeholder={lang === 'th' ? 'ชื่อ' : 'Name'}
                      className="w-full border-2 border-brand-black rounded-lg py-1.5 px-2 font-bold text-sm"
                    />
                    <textarea
                      rows={2}
                      maxLength={300}
                      value={editing.description}
                      onChange={e => setEditing({ ...editing, description: e.target.value })}
                      placeholder={lang === 'th' ? 'คำอธิบาย' : 'Description'}
                      className="w-full border-2 border-brand-black rounded-lg py-1.5 px-2 font-bold text-xs"
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-[10px] font-black tracking-wider text-gray-500 border border-gray-200 rounded-pill px-3 py-1"
                      >
                        {t('btn.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(docs)}
                        className="text-[10px] font-black tracking-wider bg-brand-red text-white rounded-pill px-3 py-1"
                      >
                        {t('btn.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base shrink-0">
                        {ICON_BY_CAT[first.category] || '📎'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm">
                          {first.display_name || first.filename}
                          {isGroup && (
                            <span className="ml-1.5 text-[10px] text-gray-400 font-bold">
                              ({docs.length} {lang === 'th' ? 'ไฟล์' : 'files'})
                            </span>
                          )}
                        </div>
                        {first.description && (
                          <div className="text-[11px] text-gray-600 font-medium mt-0.5 whitespace-pre-wrap">
                            {first.description}
                          </div>
                        )}
                        <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                          {first.category.toUpperCase()}
                          {' · '}{new Date(first.uploaded_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB')}
                        </div>
                      </div>
                    </div>

                    {/* Files list */}
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                      {docs.map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-gray-700 truncate flex-1">
                            📄 {d.filename}
                            {d.file_size && <span className="ml-1 text-gray-400 font-medium">({formatBytes(d.file_size)})</span>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => download(d)}
                              className="text-[10px] font-black tracking-wider bg-brand-black text-white rounded-pill px-2.5 py-1"
                            >
                              {t('docs.open')}
                            </button>
                            {canEdit && isGroup && (
                              <button
                                onClick={() => removeDoc(d)}
                                title={lang === 'th' ? 'ลบไฟล์นี้' : 'Delete this file'}
                                className="text-[10px] font-black tracking-wider text-gray-400 border border-gray-200 rounded-pill px-2 py-1"
                              >
                                ✗
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {canEdit && (
                      <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => setEditing({
                            groupKey,
                            name: first.display_name || '',
                            description: first.description || '',
                          })}
                          className="text-[10px] font-black tracking-wider text-gray-600 border border-gray-200 rounded-pill px-2 py-1"
                        >
                          {t('btn.edit')}
                        </button>
                        <button
                          onClick={() => isGroup ? removeGroup(docs) : removeDoc(first)}
                          className="text-[10px] font-black tracking-wider text-brand-red border border-brand-red/30 rounded-pill px-2 py-1"
                        >
                          ✗
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
