import React, { createContext, useContext, useState } from "react"
import idDict from "../i18n/locales/id.json"
import enDict from "../i18n/locales/en.json"

export type Language = "id" | "en"

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (
    path: string,
    defaultValueOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string
}

const dictionaries: Record<Language, Record<string, any>> = {
  id: idDict,
  en: enDict,
}

const resolveTranslation = (
  lang: Language,
  path: string,
  defaultValueOrParams?: string | Record<string, string | number>,
  maybeParams?: Record<string, string | number>
): string => {
  const defaultValue = typeof defaultValueOrParams === "string" ? defaultValueOrParams : undefined
  const params = typeof defaultValueOrParams === "object" ? defaultValueOrParams : maybeParams

  const keys = path.split(".")
  let current: any = dictionaries[lang]

  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = current[k]
    } else {
      current = undefined
      break
    }
  }

  // Fallback to "en" or "id" if key is not found
  if (current === undefined) {
    const fallbackLang = lang === "en" ? "id" : "en"
    let fallback: any = dictionaries[fallbackLang]
    for (const k of keys) {
      if (fallback && typeof fallback === "object" && k in fallback) {
        fallback = fallback[k]
      } else {
        fallback = undefined
        break
      }
    }
    current = fallback
  }

  const result = typeof current === "string" ? current : (defaultValue || path)

  if (params) {
    return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
      return str.replace(new RegExp(`{{${paramKey}}}`, "g"), String(paramVal))
    }, result)
  }

  return result
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (
    path: string,
    defaultValueOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => resolveTranslation("en", path, defaultValueOrParams, params),
})

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vms_lang") as Language
        if (saved === "id" || saved === "en") return saved
      } catch {
        // LocalStorage access issues
      }
      const env = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process?.env
      if (env?.NODE_ENV === "test") {
        return "en"
      }
    }
    return "id"
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vms_lang", lang)
      } catch {
        // LocalStorage write issues
      }
    }
  }

  const t = (
    path: string,
    defaultValueOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ): string => {
    return resolveTranslation(language, path, defaultValueOrParams, params)
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useTranslation = () => useContext(I18nContext)
