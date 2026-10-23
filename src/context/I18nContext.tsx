import React, { createContext, useContext, useState } from "react"
import idDict from "../i18n/locales/id.json"
import enDict from "../i18n/locales/en.json"

export type Language = "id" | "en"

export interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (
    path: string,
    defaultValueOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string
  formatDate: (
    date: string | Date | number | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ) => string
  formatTime: (date: string | Date | number | null | undefined) => string
  formatNumber: (
    num: number | null | undefined,
    options?: Intl.NumberFormatOptions
  ) => string
}

const dictionaries: Record<Language, Record<string, unknown>> = {
  id: idDict,
  en: enDict,
}

// Namespace alias mappings to maintain compatibility with existing keys and requested namespace names
const NAMESPACE_ALIASES: Record<string, string[]> = {
  addVisit: ["create_visit", "add_visit"],
  create_visit: ["addVisit", "add_visit"],
  activateVisit: ["active_visits", "activate_visit"],
  active_visits: ["activateVisit", "activate_visit"],
  reprintPass: ["reprint", "reprint_pass"],
  reprint: ["reprintPass", "reprint_pass"],
  vesselArrivals: ["vessel_arrivals", "vessel"],
  vessel_arrivals: ["vesselArrivals", "vessel"],
  vessel: ["vesselArrivals", "vessel_arrivals"],
  reportsVisits: ["visitor_report", "reports_visits"],
  visitor_report: ["reportsVisits", "reports_visits"],
  reportsVessels: ["vessel_report", "reports_vessels"],
  vessel_report: ["reportsVessels", "reports_vessels"],
  reportsCrew: ["crew_report", "reports_crew"],
  crew_report: ["reportsCrew", "reports_crew"],
  vehicleCards: ["vehicle_cards"],
  vehicle_cards: ["vehicleCards"],
  sidebar: ["nav"],
  nav: ["sidebar"],
}

const getValueByPath = (dict: unknown, path: string): string | undefined => {
  if (!dict || typeof dict !== "object") return undefined
  const keys = path.split(".")
  let current: unknown = dict
  for (const k of keys) {
    if (current && typeof current === "object" && k in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[k]
    } else {
      return undefined
    }
  }
  return typeof current === "string" ? current : undefined
}

const resolveTranslation = (
  lang: Language,
  path: string,
  defaultValueOrParams?: string | Record<string, string | number>,
  maybeParams?: Record<string, string | number>
): string => {
  const defaultValue =
    typeof defaultValueOrParams === "string" ? defaultValueOrParams : undefined
  const params =
    typeof defaultValueOrParams === "object" ? defaultValueOrParams : maybeParams

  let val = getValueByPath(dictionaries[lang], path)

  // Try namespace aliases if direct lookup failed
  if (val === undefined) {
    const dotIdx = path.indexOf(".")
    if (dotIdx > 0) {
      const ns = path.slice(0, dotIdx)
      const subPath = path.slice(dotIdx + 1)
      const aliases = NAMESPACE_ALIASES[ns] || []
      for (const alias of aliases) {
        val = getValueByPath(dictionaries[lang], `${alias}.${subPath}`)
        if (val !== undefined) break
      }
    }
  }

  // Fallback to alternate language
  if (val === undefined) {
    const fallbackLang = lang === "en" ? "id" : "en"
    val = getValueByPath(dictionaries[fallbackLang], path)
    if (val === undefined) {
      const dotIdx = path.indexOf(".")
      if (dotIdx > 0) {
        const ns = path.slice(0, dotIdx)
        const subPath = path.slice(dotIdx + 1)
        const aliases = NAMESPACE_ALIASES[ns] || []
        for (const alias of aliases) {
          val = getValueByPath(dictionaries[fallbackLang], `${alias}.${subPath}`)
          if (val !== undefined) break
        }
      }
    }
  }

  const result = val !== undefined ? val : defaultValue || path

  if (params) {
    return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
      return str
        .replace(new RegExp(`\\{\\{\\s*${paramKey}\\s*\\}\\}`, "g"), String(paramVal))
        .replace(new RegExp(`\\{\\s*${paramKey}\\s*\\}`, "g"), String(paramVal))
    }, result)
  }

  return result
}

const defaultContextValue: I18nContextType = {
  language: "id",
  setLanguage: () => {},
  t: (
    path: string,
    defaultValueOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => resolveTranslation("id", path, defaultValueOrParams, params),
  formatDate: (date, options) => {
    if (!date) return "-"
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    if (isNaN(d.getTime())) return String(date)
    return new Intl.DateTimeFormat("id-ID", options || { year: "numeric", month: "short", day: "numeric" }).format(d)
  },
  formatTime: (date) => {
    if (!date) return "-"
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    if (isNaN(d.getTime())) return String(date)
    return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d)
  },
  formatNumber: (num, options) => {
    if (num === null || num === undefined || isNaN(num)) return "0"
    return new Intl.NumberFormat("id-ID", options).format(num)
  },
}

const I18nContext = createContext<I18nContextType>(defaultContextValue)

export const I18nProvider: React.FC<{
  children: React.ReactNode
  initialLanguage?: Language
}> = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (initialLanguage) return initialLanguage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vms_lang") as Language
        if (saved === "id" || saved === "en") return saved
      } catch {
        // LocalStorage access issues
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

  const locale = language === "id" ? "id-ID" : "en-US"

  const formatDate = (
    date: string | Date | number | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    if (!date) return "-"
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    if (isNaN(d.getTime())) return String(date)
    return new Intl.DateTimeFormat(
      locale,
      options || { year: "numeric", month: "short", day: "numeric" }
    ).format(d)
  }

  const formatTime = (date: string | Date | number | null | undefined): string => {
    if (!date) return "-"
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    if (isNaN(d.getTime())) return String(date)
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d)
  }

  const formatNumber = (
    num: number | null | undefined,
    options?: Intl.NumberFormatOptions
  ): string => {
    if (num === null || num === undefined || isNaN(num)) return "0"
    return new Intl.NumberFormat(locale, options).format(num)
  }

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatDate,
        formatTime,
        formatNumber,
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTranslation = () => useContext(I18nContext)
