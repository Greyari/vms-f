import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import VisitHistory from "./VisitHistory"
import api from "@/lib/axios"

vi.mock("@/lib/axios")

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1", name: "Gate Officer" },
    hasPermission: () => true,
  }),
}))

const sampleActiveVisit = {
  id: "v-active-1",
  ticket_number: "26/10/00001",
  date: "2026-10-24",
  time_in: "08:30:00",
  time_out: null,
  check_in_at: "2026-10-24T08:30:00+07:00",
  checked_out_at: null,
  visitor_company: "PT Bahari Jaya",
  location_id: "loc-1",
  location_name: "DERMAGA 01",
  staff_id: "st-1",
  host_name: "Capt. Hadi",
  purpose: "Survey Mesin",
  vehicle_no: "BP 1234 XY",
  visitor: {
    id: "vis-1",
    name: "Ahmad Fauzi",
    id_type: "ktp",
    id_number: "2171010101010001",
    visitor_type: "regular",
  },
  visitor_cards: [{ id: "card-1", card_no: "VIS-001" }],
  vehicle_card_id: "vc-1",
  vehicle_card: { id: "vc-1", card_no: "VEH-010" },
}

const sampleCompletedVisit = {
  ...sampleActiveVisit,
  id: "v-done-2",
  ticket_number: "26/10/00002",
  checked_out_at: "2026-10-24T11:00:00+07:00",
  time_out: "11:00:00",
  visitor: {
    id: "vis-2",
    name: "Budi Santoso",
    id_type: "ktp",
    id_number: "2171010101010002",
    visitor_type: "regular",
  },
}

describe("VisitHistory Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    vi.mocked(api.get).mockImplementation((url: string, config?: any) => {
      if (url === "/locations") {
        return Promise.resolve({
          data: [{ id: "loc-1", name: "DERMAGA 01" }],
        })
      }
      if (url === "/visits") {
        const status = config?.params?.status || "active"
        const rows =
          status === "active"
            ? [sampleActiveVisit]
            : status === "completed"
              ? [sampleCompletedVisit]
              : [sampleActiveVisit, sampleCompletedVisit]
        return Promise.resolve({
          data: {
            data: rows,
            current_page: 1,
            last_page: 1,
            total: rows.length,
            counts: { active: 1, completed: 1, all: 2 },
          },
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it("opens on Active tab by default with direct Check-out button and default columns", async () => {
    render(
      <MemoryRouter>
        <VisitHistory />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Ahmad Fauzi")).toBeInTheDocument()
      expect(screen.getByText("VIS-001")).toBeInTheDocument()
      expect(screen.getByText("VEH-010")).toBeInTheDocument()
      expect(screen.getByText("BP 1234 XY")).toBeInTheDocument()
      expect(screen.getByText("Survey Mesin")).toBeInTheDocument()
    })

    const checkoutBtn = screen.getByTestId("btn-checkout-v-active-1")
    expect(checkoutBtn).toBeVisible()
    expect(checkoutBtn).not.toBeDisabled()
  })

  it("disables Check-out and Edit buttons with tooltip on completed visits", async () => {
    render(
      <MemoryRouter>
        <VisitHistory />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Ahmad Fauzi")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("tab-status-completed"))

    await waitFor(() => {
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument()
    })

    const checkoutBtn = screen.getByTestId("btn-checkout-v-done-2")
    const editBtn = screen.getByTestId("btn-edit-v-done-2")
    const reprintBtn = screen.getByTestId("btn-reprint-v-done-2")

    expect(checkoutBtn).toBeDisabled()
    expect(editBtn).toBeDisabled()
    expect(editBtn.getAttribute("title")).toMatch(
      /kunjungan sudah selesai, tidak bisa diedit|visit completed, cannot be edited/i
    )
    expect(reprintBtn).not.toBeDisabled()
  })

  it("persists column visibility selection in localStorage", async () => {
    render(
      <MemoryRouter>
        <VisitHistory />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Ahmad Fauzi")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("column-picker-trigger"))
    const hostCheckbox = screen.getByLabelText(/staf yang dikunjungi|staff to visit/i)
    fireEvent.click(hostCheckbox)

    await waitFor(() => {
      expect(screen.getByText("Capt. Hadi")).toBeInTheDocument()
    })

    const savedCols = JSON.parse(
      localStorage.getItem("vms_visit_history_columns_v3_u-1") || "[]"
    )
    expect(savedCols).toContain("host")
  })
})
