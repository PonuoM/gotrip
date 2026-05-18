// ============================================================================
// Themed confirm/alert dialog API. Mount <DialogHost /> once at the root,
// then call confirmDialog() / alertDialog() like the native equivalents.
// Falls back to window.confirm/window.alert if host isn't mounted yet.
// ============================================================================

export interface DialogOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean        // red confirm button + warning icon
  requireText?: string    // user must type this exactly to enable confirm
  requireTextHint?: string // placeholder shown in the input
}

interface DialogState extends DialogOptions {
  open: boolean
  type: 'confirm' | 'alert'
}

type Setter = (state: DialogState) => void

let setStateFn: Setter | null = null
let resolveFn: ((value: boolean) => void) | null = null

export function _registerDialogHost(setter: Setter) {
  setStateFn = setter
}

export function _respondDialog(value: boolean) {
  const r = resolveFn
  resolveFn = null
  setStateFn?.({ open: false, type: 'alert', message: '' })
  r?.(value)
}

export function confirmDialog(input: string | DialogOptions): Promise<boolean> {
  const opts = typeof input === 'string' ? { message: input } : input
  if (!setStateFn) {
    if (typeof window === 'undefined') return Promise.resolve(false)
    return Promise.resolve(window.confirm(opts.message))
  }
  return new Promise(resolve => {
    resolveFn = resolve
    setStateFn!({ open: true, type: 'confirm', ...opts })
  })
}

export function alertDialog(input: string | DialogOptions): Promise<void> {
  const opts = typeof input === 'string' ? { message: input } : input
  if (!setStateFn) {
    if (typeof window !== 'undefined') window.alert(opts.message)
    return Promise.resolve()
  }
  return new Promise<void>(resolve => {
    resolveFn = () => resolve()
    setStateFn!({ open: true, type: 'alert', ...opts })
  })
}
