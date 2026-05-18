'use client'

import { useEffect, useState, useCallback } from 'react'
import { _registerDialogHost, _respondDialog } from '@/lib/dialog'

interface State {
  open: boolean
  type: 'confirm' | 'alert'
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  requireText?: string
  requireTextHint?: string
}

const INITIAL: State = { open: false, type: 'alert', message: '' }

export function DialogHost() {
  const [state, setState] = useState<State>(INITIAL)
  const [typedText, setTypedText] = useState('')

  useEffect(() => {
    _registerDialogHost((next) => {
      setState(next as State)
      setTypedText('')
    })
  }, [])

  const close = useCallback((value: boolean) => _respondDialog(value), [])

  const requireText = state.requireText
  const confirmEnabled = !requireText || typedText === requireText

  // Esc / outside click cancel — confirm dialogs treat both as "cancel",
  // alert dialogs treat both as "ok" since there's only one action.
  useEffect(() => {
    if (!state.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(state.type === 'alert' ? true : false)
      else if (e.key === 'Enter' && confirmEnabled && !requireText) close(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.open, state.type, close, confirmEnabled, requireText])

  if (!state.open) return null

  const isDanger = state.danger
  const confirmLabel = state.confirmLabel || (state.type === 'alert' ? 'OK' : 'CONFIRM')
  const cancelLabel = state.cancelLabel || 'CANCEL'

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] dialog-fade"
      onMouseDown={() => close(state.type === 'alert' ? true : false)}
    >
      <div
        className="relative w-full max-w-sm bg-white border-2 border-brand-black rounded-2xl rounded-b-none sm:rounded-2xl shadow-xl m-0 sm:m-4 p-5 dialog-rise"
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Brand stripe */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${isDanger ? 'bg-brand-red' : 'bg-brand-black'}`} />

        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full border-2 border-brand-black flex items-center justify-center text-lg shrink-0 ${
              isDanger ? 'bg-brand-red text-white' : 'bg-brand-yellow text-brand-black'
            }`}
            style={!isDanger ? { backgroundColor: '#FFC107' } : undefined}
          >
            {isDanger ? '⚠' : 'ℹ'}
          </div>
          <div className="flex-1 min-w-0">
            {state.title && (
              <div className="text-[10px] font-black tracking-[2px] text-gray-500 uppercase mb-1">
                {state.title}
              </div>
            )}
            <div className="text-sm font-bold whitespace-pre-wrap leading-relaxed">
              {state.message}
            </div>
          </div>
        </div>

        {requireText && (
          <div className="mt-4">
            <div className="text-[10px] font-bold text-gray-500 mb-1">
              {state.requireTextHint || `Type "${requireText}" to confirm`}
            </div>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              value={typedText}
              onChange={e => setTypedText(e.target.value)}
              className="w-full border-2 border-brand-black rounded-lg py-2 px-3 font-bold text-sm"
            />
          </div>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          {state.type === 'confirm' && (
            <button
              type="button"
              onClick={() => close(false)}
              className="text-[11px] font-black tracking-wider px-4 py-2.5 rounded-pill border-2 border-gray-300 text-gray-600 bg-white"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => close(true)}
            autoFocus={!requireText}
            disabled={!confirmEnabled}
            className={`text-[11px] font-black tracking-wider px-4 py-2.5 rounded-pill border-2 border-brand-black disabled:opacity-40 disabled:cursor-not-allowed ${
              isDanger ? 'bg-brand-red text-white' : 'bg-brand-black text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
