import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { MemoryRouter } from "react-router-dom"
import CreateVisit, { unwrap, resetCreateVisitCache } from "./CreateVisit"
import api from "@/lib/axios"
import { toast } from "sonner"
import { I18nProvider } from "@/context/I18nContext"
import idDict from "@/i18n/locales/id.json"
import enDict from "@/i18n/locales/en.json"

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

const mockNavigate = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/lib/axios")
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}))

describe("CreateVisit Page & Master Data", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCreateVisitCache()
    if (typeof localStorage !== "undefined") {
      localStorage.clear()
    }

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/visitors/check-ktp/1234567890123456")) {
        return Promise.resolve({
          data: {
            data: {
              id: "v-101",
              name: "Ahmad Dahlan",
              id_type: "ktp",
              id_number: "1234567890123456",
              company: "PT Maritim Maju",
              is_blacklisted: false,
            },
          },
        })
      }
      if (url.includes("/locations")) {
        return Promise.resolve({
          data: [
            { id: "loc-1", name: "STORE", type: "location", is_active: true },
            { id: "loc-2", name: "Dermaga 1", type: "location", is_active: true },
          ],
        })
      }
      if (url.includes("/staffs")) {
        return Promise.resolve({
          data: [{ id: "staff-1", name: "Budi Santoso", department: "Engineering" }],
        })
      }
      if (url.includes("/cards")) {
        return Promise.resolve({
          data: [
            { id: "c-1", card_no: "V-001", card_type: "visitor", status: "available" },
            { id: "c-2", card_no: "V-002", card_type: "visitor", status: "available" },
          ],
        })
      }
      if (url.includes("/vehicle-cards")) {
        return Promise.resolve({
          data: [
            { id: "vc-1", card_no: "VEH-001", card_type: "vehicle", status: "available" },
          ],
        })
      }
      if (url.includes("/lookups/purposes")) {
        return Promise.resolve({
          data: ["Meeting", "Maintenance", "Delivery"],
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  describe("unwrap() helper", () => {
    it("handles direct arrays", () => {
      const input = [{ id: 1, name: "STORE" }]
      expect(unwrap({ data: input })).toEqual(input)
      expect(unwrap(input)).toEqual(input)
    })

    it("handles standard paginated response { data: [...] }", () => {
      const items = [{ id: 2, name: "STORE" }]
      expect(unwrap({ data: { data: items } })).toEqual(items)
    })

    it("handles triple nested { data: { data: { data: [...] } } }", () => {
      const items = [{ id: 3, name: "STORE" }]
      expect(unwrap({ data: { data: { data: items } } })).toEqual(items)
    })

    it("handles wrapped resources like { locations: [...] } or { data: { locations: [...] } }", () => {
      const locs = [{ id: 4, name: "STORE" }]
      expect(unwrap({ data: { locations: locs } })).toEqual(locs)
      expect(unwrap({ locations: locs })).toEqual(locs)

      const staffs = [{ id: 5, name: "Slamet" }]
      expect(unwrap({ data: { staffs } })).toEqual(staffs)

      const cards = [{ id: 6, card_no: "V-100" }]
      expect(unwrap({ data: { cards } })).toEqual(cards)
    })

    it("returns empty array for invalid, null or empty inputs", () => {
      expect(unwrap(null)).toEqual([])
      expect(unwrap(undefined)).toEqual([])
      expect(unwrap({})).toEqual([])
      expect(unwrap({ data: null })).toEqual([])
      expect(unwrap({ data: {} })).toEqual([])
    })
  })

  describe("Master data loading & error handling", () => {
    it("shows toast error and logs when master data endpoint fails, without caching empty result", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/locations")) {
          return Promise.reject({
            response: { status: 500 },
            message: "Internal Server Error",
          })
        }
        return Promise.resolve({ data: [] })
      })

      render(
        <MemoryRouter>
          <CreateVisit />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/\/locations.*500/i)
        )
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("/locations"),
          expect.anything()
        )
      })

      consoleSpy.mockRestore()
    })

    it("populates dropdown with location 'STORE' even if list is large", async () => {
      const largeLocationList = Array.from({ length: 1474 }, (_, idx) => ({
        id: `loc-${idx}`,
        name: idx === 1289 ? "STORE" : `Location ${idx}`,
        type: idx === 1289 ? "location" : "repair_vessel",
        is_active: true,
      }))

      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/locations")) {
          return Promise.resolve({ data: largeLocationList })
        }
        if (url.includes("/visitors/check-ktp/1234567890123456")) {
          return Promise.resolve({
            data: {
              data: {
                id: "v-101",
                name: "Ahmad Dahlan",
                id_type: "ktp",
                id_number: "1234567890123456",
                is_blacklisted: false,
              },
            },
          })
        }
        return Promise.resolve({ data: [] })
      })

      render(
        <MemoryRouter>
          <CreateVisit />
        </MemoryRouter>
      )

      // Unlock Step 2 by checking registered visitor
      fireEvent.change(screen.getByPlaceholderText(/ketik nomor, tekan enter untuk cek/i), {
        target: { value: "1234567890123456" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cek nomor id/i }))

      await waitFor(() => {
        expect(screen.getByText("Ahmad Dahlan")).toBeInTheDocument()
      })

      // Check that STORE can be searched and selected in location SearchSelect
      const locationInput = document.getElementById("location_id") as HTMLInputElement
      expect(locationInput).toBeInTheDocument()
      await waitFor(() => {
        expect(locationInput).not.toBeDisabled()
      })
      await waitFor(() => {
        expect(locationInput).toHaveFocus()
      })

      fireEvent.change(locationInput, { target: { value: "STORE" } })

      const storeOption = await screen.findByText("STORE")
      fireEvent.mouseDown(storeOption)

      await waitFor(() => {
        expect(locationInput.value).toBe("STORE")
      })
    })
  })

  describe("Visitor Search & Step 1 check-only flow", () => {
    it("locks Step 2 and 3 fieldset initially until a registered visitor is checked", () => {
      render(
        <MemoryRouter>
          <CreateVisit />
        </MemoryRouter>
      )

      const fieldset = document.querySelector("fieldset")
      expect(fieldset).toBeDisabled()
    })

    it("shows visitor not registered notice when visitor is not found in database", async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/visitors/check-ktp/9999999999999999")) {
          return Promise.resolve({ data: { data: null } })
        }
        return Promise.resolve({ data: [] })
      })

      render(
        <MemoryRouter>
          <CreateVisit />
        </MemoryRouter>
      )

      const idInput = screen.getByPlaceholderText(/ketik nomor, tekan enter untuk cek/i)
      fireEvent.change(idInput, { target: { value: "9999999999999999" } })

      const checkBtn = screen.getByRole("button", { name: /cek nomor id/i })
      fireEvent.click(checkBtn)

      await waitFor(() => {
        expect(
          screen.getByText(/pengunjung belum terdaftar/i)
        ).toBeInTheDocument()
      })

      // Fieldset remains disabled
      const fieldset = document.querySelector("fieldset")
      expect(fieldset).toBeDisabled()
    })

    it("unlocks Step 2 & 3 when a registered visitor is found", async () => {
      render(
        <MemoryRouter>
          <CreateVisit />
        </MemoryRouter>
      )

      const idInput = screen.getByPlaceholderText(/ketik nomor, tekan enter untuk cek/i)
      fireEvent.change(idInput, { target: { value: "1234567890123456" } })

      const checkBtn = screen.getByRole("button", { name: /cek nomor id/i })
      fireEvent.click(checkBtn)

      await waitFor(() => {
        expect(screen.getByText("Ahmad Dahlan")).toBeInTheDocument()
        expect(screen.getByText("PT Maritim Maju")).toBeInTheDocument()
      })

      // Fieldset is now enabled
      const fieldset = document.querySelector("fieldset")
      expect(fieldset).not.toBeDisabled()
    })

    it("blocks registration and shows blacklist warning if visitor is blacklisted", async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/visitors/check-ktp/9990001112223334")) {
          return Promise.resolve({
            data: {
              data: {
                id: "v-black",
                name: "Pelanggar Aturan",
                id_type: "ktp",
                id_number: "9990001112223334",
                is_blacklisted: true,
                blacklist_reason: "Merokok di area terlarang galangan",
              },
            },
          })
        }
        return Promise.resolve({ data: [] })
      })

      render(
        <MemoryRouter>
          <CreateVisit />
        </MemoryRouter>
      )

      fireEvent.change(screen.getByPlaceholderText(/ketik nomor, tekan enter untuk cek/i), {
        target: { value: "9990001112223334" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cek nomor id/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/pengunjung diblacklist/i)
        ).toBeInTheDocument()
        expect(
          screen.getByText(/merokok di area terlarang galangan/i)
        ).toBeInTheDocument()
      })

      const submitBtn = screen.getByRole("button", {
        name: /simpan & cetak tiket/i,
      })
      expect(submitBtn).toBeDisabled()
    })
  })

  describe("Vessel Info Card & Host setting", () => {
    it("renders vessel card and sets Captain as Host on button click", async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes("/visitors/check-ktp/1234567890123456")) {
          return Promise.resolve({
            data: {
              data: {
                id: "v-101",
                name: "Ahmad Dahlan",
                id_type: "ktp",
                id_number: "1234567890123456",
                is_blacklisted: false,
              },
            },
          })
        }
        if (url.includes("/locations")) {
          return Promise.resolve({
            data: [
              {
                id: "vessel-1",
                name: "GAS WIDURI",
                code: "9764790",
                type: "repair_vessel",
                vessel_type: "LPG TANKER",
                call_sign: "POJR",
                flag: "INDONESIA",
                captain: "CAPT. SUTRISNO",
                pic: "ALVI",
                is_active: true,
              },
            ],
          })
        }
        return Promise.resolve({ data: [] })
      })

      render(
        <MemoryRouter>
          <CreateVisit />
        </MemoryRouter>
      )

      // Unlock by checking visitor
      fireEvent.change(screen.getByPlaceholderText(/ketik nomor, tekan enter untuk cek/i), {
        target: { value: "1234567890123456" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cek nomor id/i }))

      await waitFor(() => {
        expect(screen.getByText("Ahmad Dahlan")).toBeInTheDocument()
      })

      // Wait for master data to finish loading
      const locationInput = document.getElementById("location_id") as HTMLInputElement
      expect(locationInput).toBeInTheDocument()

      // Select vessel
      fireEvent.focus(locationInput)
      fireEvent.change(locationInput, { target: { value: "GAS" } })
      await waitFor(() => {
        expect(screen.getByText("GAS WIDURI")).toBeInTheDocument()
      })
      fireEvent.mouseDown(screen.getByText("GAS WIDURI"))

      // Vessel card appears
      await waitFor(() => {
        expect(screen.getByText("CAPT. SUTRISNO")).toBeInTheDocument()
        expect(screen.getByText("ALVI")).toBeInTheDocument()
        expect(screen.getByText("POJR")).toBeInTheDocument()
      })
    })
  })

  describe("Open visit conflict handling", () => {
    it("handles 422 open visit conflict and retries with close_open_visits: true", async () => {
      vi.mocked(api.post)
        .mockRejectedValueOnce({
          response: {
            status: 422,
            data: {
              message: "Pengunjung ini masih memiliki kunjungan terbuka.",
              open_visit_id: "visit-old-99",
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            visit: { id: "visit-new-100", ticket_number: "TK-2026-0001" },
          },
        })

      render(
        <MemoryRouter>
          <CreateVisit />
        </MemoryRouter>
      )

      // Check visitor to unlock
      fireEvent.change(screen.getByPlaceholderText(/ketik nomor, tekan enter untuk cek/i), {
        target: { value: "1234567890123456" },
      })
      fireEvent.click(screen.getByRole("button", { name: /cek nomor id/i }))

      await waitFor(() => {
        expect(screen.getByText("Ahmad Dahlan")).toBeInTheDocument()
      })

      // Wait for master data to finish loading
      const locationInput = document.getElementById("location_id") as HTMLInputElement
      expect(locationInput).toBeInTheDocument()

      // Select location
      fireEvent.focus(locationInput)
      fireEvent.change(locationInput, { target: { value: "STORE" } })
      await waitFor(() => {
        expect(screen.getByText("STORE")).toBeInTheDocument()
      })
      fireEvent.mouseDown(screen.getByText("STORE"))

      // Fill purpose
      const purposeInput = document.getElementById("purpose") as HTMLInputElement
      fireEvent.focus(purposeInput)
      fireEvent.change(purposeInput, { target: { value: "AUDIT GUDANG" } })

      // Select staff
      const staffInput = document.getElementById("staff_id") as HTMLInputElement
      fireEvent.focus(staffInput)
      fireEvent.change(staffInput, { target: { value: "Budi" } })
      await waitFor(() => {
        expect(screen.getByText("Budi Santoso")).toBeInTheDocument()
      })
      fireEvent.mouseDown(screen.getByText("Budi Santoso"))

      // Submit form
      const submitBtn = screen.getByRole("button", {
        name: /simpan & cetak tiket/i,
      })
      fireEvent.click(submitBtn)

      // Conflict dialog appears
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /kunjungan lama masih terbuka/i })
        ).toBeInTheDocument()
      })

      // Click Tutup Kunjungan Lama & Check-In
      const confirmBtn = screen.getByRole("button", {
        name: /tutup kunjungan lama & check-in/i,
      })
      fireEvent.click(confirmBtn)

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledTimes(2)
        expect(api.post).toHaveBeenLastCalledWith(
          "/visits",
          expect.objectContaining({
            close_open_visits: true,
          })
        )
        expect(mockNavigate).toHaveBeenCalledWith("/visits/visit-new-100/print", {
          state: { visit: { id: "visit-new-100", ticket_number: "TK-2026-0001" } },
        })
      })
    })
  })

  describe("Bilingual Support & Locale key parity", () => {
    it("renders page in English when language is 'en'", async () => {
      render(
        <I18nProvider initialLanguage="en">
          <MemoryRouter>
            <CreateVisit />
          </MemoryRouter>
        </I18nProvider>
      )

      expect(
        screen.getByRole("heading", { name: /visit registration/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: /search visitor/i })
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText(/type id number, press enter to check/i)
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /check id number/i })).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /save & print ticket/i })
      ).toBeInTheDocument()
    })

    it("renders page in Indonesian when language is 'id'", async () => {
      render(
        <I18nProvider initialLanguage="id">
          <MemoryRouter>
            <CreateVisit />
          </MemoryRouter>
        </I18nProvider>
      )

      expect(
        screen.getByRole("heading", { name: /pendaftaran kunjungan/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: /cari pengunjung/i })
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText(/ketik nomor, tekan enter untuk cek/i)
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cek nomor id/i })).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /simpan & cetak tiket/i })
      ).toBeInTheDocument()
    })

    it("verifies 100% key parity between id.json and en.json for all create_visit keys", () => {
      const idKeys = Object.keys(idDict.create_visit || {}).sort()
      const enKeys = Object.keys(enDict.create_visit || {}).sort()

      expect(idKeys.length).toBeGreaterThan(50)
      expect(idKeys).toEqual(enKeys)
    })
  })
})
