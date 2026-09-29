import { useEffect, useState } from "react"
import api from "@/lib/axios"

/**
 * Per-yard settings from GET /api/app-config (decision PE-7): one SPA build serves every yard, and each
 * yard's server says whose name, address and logo go on the printed pass.
 */
export type AppConfig = {
  company_name: string
  company_address: string
  logo_url: string | null
  yard_code: string
}

export const EMPTY_APP_CONFIG: AppConfig = {
  company_name: "",
  company_address: "",
  logo_url: null,
  yard_code: "",
}

/** Printed when the yard has not set VMS_COMPANY_NAME, same as the backend's report PDF. */
export const FALLBACK_COMPANY_NAME = "Visitor Management System"

let pending: Promise<AppConfig> | null = null

function asAppConfig(data: unknown): AppConfig {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
  const text = (value: unknown) => (typeof value === "string" ? value : "")
  const logo = d.logo_url

  return {
    company_name: text(d.company_name),
    company_address: text(d.company_address),
    // Only a file the gate itself serves from public/branding/.
    logo_url: typeof logo === "string" && logo.startsWith("/branding/") ? logo : null,
    yard_code: text(d.yard_code),
  }
}

/** Fetched once per page load; a failure resolves to the empty config and is retried by the next caller. */
export function loadAppConfig(): Promise<AppConfig> {
  if (!pending) {
    pending = Promise.resolve()
      .then(() => api.get("/app-config", { timeout: 5000 }))
      .then((res) => asAppConfig(res?.data))
      .catch(() => {
        pending = null
        return EMPTY_APP_CONFIG
      })
  }
  return pending
}

/** Tests only: forget the fetched config. */
export function resetAppConfigCache(): void {
  pending = null
}

/** `ready` turns true once the config is known (or known to be unavailable), so a pass prints only then. */
export function useAppConfig(): { config: AppConfig; ready: boolean } {
  const [state, setState] = useState<{ config: AppConfig; ready: boolean }>({
    config: EMPTY_APP_CONFIG,
    ready: false,
  })

  useEffect(() => {
    let active = true
    loadAppConfig().then((config) => {
      if (active) setState({ config, ready: true })
    })
    return () => {
      active = false
    }
  }, [])

  return state
}
