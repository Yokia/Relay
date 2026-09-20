import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { Language, TranslationSchema } from './types'
import { zhCN } from './locales/zh-CN'
import { enUS } from './locales/en-US'

const dictionaries: Record<Language, TranslationSchema> = {
  'zh-CN': zhCN,
  'en-US': enUS
}

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split('.')
  let current: any = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`
  })
}

export interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (keyPath: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType>({
  language: 'zh-CN',
  setLanguage: () => {},
  t: (key) => key
})

interface I18nProviderProps {
  language?: Language
  onLanguageChange?: (lang: Language) => void
  children: React.ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  language: propLanguage,
  onLanguageChange,
  children
}) => {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    return propLanguage || (localStorage.getItem('relay_language') as Language) || 'zh-CN'
  })

  useEffect(() => {
    if (propLanguage && propLanguage !== currentLang) {
      setCurrentLang(propLanguage)
      localStorage.setItem('relay_language', propLanguage)
    }
  }, [propLanguage])

  const setLanguage = (lang: Language) => {
    setCurrentLang(lang)
    localStorage.setItem('relay_language', lang)
    if (onLanguageChange) {
      onLanguageChange(lang)
    }
  }

  const value = useMemo<I18nContextType>(() => {
    const dict = dictionaries[currentLang] || dictionaries['zh-CN']
    const fallbackDict = dictionaries['zh-CN']

    const t = (keyPath: string, params?: Record<string, string | number>): string => {
      const found = getNestedValue(dict, keyPath) || getNestedValue(fallbackDict, keyPath) || keyPath
      return interpolate(found, params)
    }

    return {
      language: currentLang,
      setLanguage,
      t
    }
  }, [currentLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextType {
  return useContext(I18nContext)
}

export * from './types'
