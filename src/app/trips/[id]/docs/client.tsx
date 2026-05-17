'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { t as translate, type TKey } from '@/lib/i18n'

interface Doc {
  id: string
  filename: string
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

  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<Doc['category']>('ticket')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError(t('docs.pick_first'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t('docs.too_big'))
      return
    }

    setUploading(true)
    setError('')
    setProgress(t('docs.uploading'))

    const ext = file.name.split('.').pop() || 'bin'
    const key = `${tripId}/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('trip-documents')
      .upload(key, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
      })

    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      setProgress('')
      return
    }

    setProgress(t('docs.saving'))
    const { error: dbErr } = await supabase.from('documents').insert({
      trip_id: tripId,
      filename: file.name,
      file_url: key,  // store storage key, generate signed URL on read
      file_size: file.size,
      mime_type: file.type || null,
      category,
    })

    if (dbErr) {
      // Roll back the upload
      await supabase.storage.from('trip-documents').remove([key])
      setError(dbErr.message)
      setUploading(false)
      setProgress('')
      return
    }

    setFile(null)
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

  const remove = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.filename}"?`)) return
    await supabase.storage.from('trip-documents').remove([doc.file_url])
    await supabase.from('documents').delete().eq('id', doc.id)
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
            <div className="text-[9px] font-black tracking-[1.5px] text-gray-600 mb-1.5">{t('docs.file')}</div>
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              accept="image/*,application/pdf"
              className="w-full text-xs font-bold border-2 border-dashed border-gray-300 rounded-lg p-3"
            />
          </label>

          {file && (
            <div className="text-[11px] text-gray-500 font-bold">
              {file.name} · {formatBytes(file.size)}
            </div>
          )}

          {progress && (
            <div className="text-xs text-brand-red font-bold">{progress}</div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="btn-primary w-full disabled:opacity-50"
          >
            {uploading ? (t('docs.uploading')).toUpperCase() : t('docs.upload_btn')}
          </button>
        </form>
      )}

      {/* List */}
      <div className="text-xs font-black uppercase tracking-[2px] mb-3">
        {t('docs.all_files')} · {documents.length}
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {t('docs.no_files')}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="card-base p-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base shrink-0">
                  {ICON_BY_CAT[doc.category] || '📎'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm truncate">{doc.filename}</div>
                  <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                    {doc.category.toUpperCase()}
                    {doc.file_size && <> · {formatBytes(doc.file_size)}</>}
                    {' · '}{new Date(doc.uploaded_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => download(doc)}
                  className="text-[10px] font-black tracking-wider bg-brand-black text-white rounded-pill px-3 py-1"
                >
                  {t('docs.open')}
                </button>
                {canEdit && (
                  <button
                    onClick={() => remove(doc)}
                    className="text-[10px] font-black tracking-wider text-brand-red border border-brand-red/30 rounded-pill px-2 py-1"
                  >
                    ✗
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
