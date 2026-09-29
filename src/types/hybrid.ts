/** Hybrid multi-yard payloads (docs/vms-hybrid-architecture-spec.md §5–§8). */

export type ReasonCategory =
  | "k3_violation"
  | "asset_theft_damage"
  | "misconduct"
  | "other"

/** The fixed categories that may travel between yards (decision SEC-6d). */
export const REASON_CATEGORIES: { value: ReasonCategory; label: string }[] = [
  { value: "k3_violation", label: "Pelanggaran K3" },
  { value: "asset_theft_damage", label: "Pencurian/kerusakan aset" },
  { value: "misconduct", label: "Perilaku tidak pantas" },
  { value: "other", label: "Lainnya" },
]

/** What the counter may see about a global entry (check-ktp, 422 on check-in, warnings). */
export interface GlobalBlacklistHit {
  id_type: string
  name: string
  reason_category: ReasonCategory
  reason_label: string
  registered_by_yard: string
}

export interface GlobalBlacklistEntry extends GlobalBlacklistHit {
  id: string
  id_number: string
  is_active: boolean
  can_revoke: boolean
  updated_at: string | null
}

export interface OutboxRow {
  id: string
  action: "add" | "revoke"
  id_type: string
  id_number: string
  name: string
  reason_label: string | null
  local_note: string | null
  requested_by: string | null
  status: "pending" | "sent" | "rejected"
  attempts: number
  last_error: string | null
  created_at: string | null
  sent_at: string | null
}

export interface PreRegistration {
  token: string
  id_type: string
  id_number: string
  name: string
  company: string | null
  phone: string | null
  gender: "M" | "F" | null
  purpose: string | null
  host_name: string | null
  host_department: string | null
  scheduled_date: string
  vehicle_no: string | null
  status: "pending" | "checked_in" | "expired"
}

export type SyncLevel = "green" | "yellow" | "red" | "off"

export interface SyncStatus {
  enabled: boolean
  yard_code: string
  level: SyncLevel
  minutes_since_sync: number | null
  pending_outbox: number
  channels: {
    key: string
    status: string | null
    last_success_at: string | null
    last_attempt_at: string | null
    last_error: string | null
  }[]
}
