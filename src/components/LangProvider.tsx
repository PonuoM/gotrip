'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { type Lang, t as translate, type TKey } from '@/lib/i18n'

const LangContext = createContext<Lang>('th')

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

export function useLang(): Lang {
  return useContext(LangContext)
}

export function useT() {
  const lang = useLang()
  return (key: TKey) => translate(lang, key)
}
