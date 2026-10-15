import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { BrowserRouter } from "react-router-dom"
import BlacklistedVisitors from "./BlacklistedVisitors"
import { I18nProvider } from "@/context/I18nContext"
import api from "@/lib/axios"

vi.mock("@/lib/axios")

const mockBlacklistRecords = [
  {
    id: "bl-001",
    blacklist_id: "bl-001",
    visitor_id: "vis-101",
    name: "Rian Hidayat",
    badge_code: "HID-9901",
    id_number: "2171018888880002",
    offences: "Merokok di area berbahaya tangki bahan bakar",
    date: "2026-10-15",
    blacklisted_at: "2026-10-15 08:30:00",
    remark: "Pelanggaran keselamatan fatal",
    company: "PT Galangan Cemerlang",
    is_blacklisted: true,
  },
]

const mockSearchResults = [
  {
    id: "vis-202",
    visitor_no: "VIS-2026-0202",
    name: "Budi Prakoso",
    id_type: "ktp",
    id_number: "3201019999990005",
    company: "PT Sumber Bahari",
    visits_count: 4,
    is_blacklisted: false,
    badge_code: "HID-7722",
  },
  {
    id: "vis-999",
    visitor_no: "VIS-2026-0999",
    name: "Toni Dilarang",
    id_type: "ktp",
    id_number: "3201019999990999",
    company: "PT Larang",
    visits_count: 1,
    is_blacklisted: true,
    badge_code: "HID-0000",
  },
]

describe("Blacklist Master Flow & Column Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/visitors/search")) {
        return Promise.resolve({ data: { data: mockSearchResults } })
      }
      if (url.includes("/visitors/blacklisted")) {
        return Promise.resolve({
          data: {
            data: mockBlacklistRecords,
            current_page: 1,
            last_page: 1,
            total: 1,
          },
        })
      }
      return Promise.resolve({ data: [] })
    })
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, message: "Saved successfully" },
    })
  })

  it("renders the table with the exact official columns in sequence", async () => {
    render(
      <BrowserRouter>
        <I18nProvider>
          <BlacklistedVisitors />
        </I18nProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Rian Hidayat")).toBeInTheDocument()
    })

    // Check header columns in the exact official sequence:
    // NO | NAME OF OFFENDER | BADGE / H.I.D CODE | KTP NO | OFFENCES | DATE | REMARK | COMPANY NAME | ACTIONS
    expect(screen.getByText("NO")).toBeInTheDocument()
    expect(screen.getByText("NAME OF OFFENDER")).toBeInTheDocument()
    expect(screen.getByText("BADGE / H.I.D CODE")).toBeInTheDocument()
    expect(screen.getByText("KTP NO")).toBeInTheDocument()
    expect(screen.getByText("OFFENCES")).toBeInTheDocument()
    expect(screen.getByText("DATE")).toBeInTheDocument()
    expect(screen.getByText("REMARK")).toBeInTheDocument()
    expect(screen.getByText("COMPANY NAME")).toBeInTheDocument()

    // Row values rendered in correct cells
    expect(screen.getByText("HID-9901")).toBeInTheDocument()
    expect(screen.getByText("2171018888880002")).toBeInTheDocument()
    expect(screen.getByText(/merokok di area berbahaya/i)).toBeInTheDocument()
    expect(screen.getByText("PT Galangan Cemerlang")).toBeInTheDocument()
  })

  it("opens Blacklist Detail modal when Detail button is clicked", async () => {
    render(
      <BrowserRouter>
        <I18nProvider>
          <BlacklistedVisitors />
        </I18nProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Rian Hidayat")).toBeInTheDocument()
    })

    const detailBtn = screen.getByRole("button", { name: /detail/i })
    fireEvent.click(detailBtn)

    await waitFor(() => {
      expect(screen.getByText(/blacklist record details|detail data blacklist/i)).toBeInTheDocument()
      expect(screen.getByText(/data linked from master visitors|data terhubung dari master visitors/i)).toBeInTheDocument()
    })
  })

  it("searches existing visitors in autocomplete and auto-fills fields as read-only", async () => {
    render(
      <BrowserRouter>
        <I18nProvider>
          <BlacklistedVisitors />
        </I18nProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Rian Hidayat")).toBeInTheDocument()
    })

    // Open Add Blacklist modal
    const addBtn = screen.getByRole("button", { name: /tambah blacklist/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByText(/select visitor from master data|pilih visitor dari master data/i)).toBeInTheDocument()
    })

    // Type in autocomplete search input
    const searchInput = screen.getByPlaceholderText(/type name, ktp number, or company to search|ketik nama, nomor ktp, atau perusahaan untuk mencari/i)
    fireEvent.change(searchInput, { target: { value: "Budi" } })

    // Wait for debounced search API call
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/visitors/search?q=Budi")
      expect(screen.getByText("Budi Prakoso")).toBeInTheDocument()
      expect(screen.getByText("Toni Dilarang")).toBeInTheDocument()
    })

    // Toni is already blacklisted and cannot be selected
    expect(screen.getByText(/already blacklisted|sudah di-blacklist/i)).toBeInTheDocument()

    // Select Budi Prakoso
    const selectBtn = screen.getByRole("button", { name: /select|pilih/i })
    fireEvent.click(selectBtn)

    // Name, KTP, Company should now be filled and locked (readOnly)
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(/full name of offender|nama lengkap pelaku/i) as HTMLInputElement
      expect(nameInput.value).toBe("Budi Prakoso")
      expect(nameInput).toHaveAttribute("readonly")

      const ktpInput = screen.getByPlaceholderText(/ktp or identity document number|nomor ktp atau dokumen identitas/i) as HTMLInputElement
      expect(ktpInput.value).toBe("3201019999990005")
      expect(ktpInput).toHaveAttribute("readonly")

      const companyInput = screen.getByPlaceholderText(/company \/ agency name|nama instansi\/perusahaan/i) as HTMLInputElement
      expect(companyInput.value).toBe("PT Sumber Bahari")
      expect(companyInput).toHaveAttribute("readonly")

      // Badge code is pre-filled but EDITABLE
      const badgeInput = screen.getByPlaceholderText(/e\.g\. hid-1029|contoh: hid-1029/i) as HTMLInputElement
      expect(badgeInput.value).toBe("HID-7722")
      expect(badgeInput).not.toHaveAttribute("readonly")
    })

    // Fill offences and submit
    const offencesInput = screen.getByPlaceholderText(/describe the violation|tuliskan bentuk pelanggaran/i)
    fireEvent.change(offencesInput, { target: { value: "Membawa barang terlarang ke dermaga" } })

    const submitBtn = screen.getByRole("button", { name: /add to blacklist|tambahkan ke blacklist/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/visitors/blacklisted",
        expect.objectContaining({
          visitor_id: "vis-202",
          name: "Budi Prakoso",
          id_number: "3201019999990005",
          company: "PT Sumber Bahari",
          badge_code: "HID-7722",
          offences: "Membawa barang terlarang ke dermaga",
        })
      )
    })
  })

  it("supports unregistered visitor manual entry and atomic registration", async () => {
    render(
      <BrowserRouter>
        <I18nProvider>
          <BlacklistedVisitors />
        </I18nProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Rian Hidayat")).toBeInTheDocument()
    })

    // Open Add Blacklist modal
    fireEvent.click(screen.getByRole("button", { name: /tambah blacklist/i }))

    // Click "Visitor not registered? Add new unregistered visitor"
    const unregisteredBtn = await screen.findByText(/add new unregistered visitor|tambah baru belum terdaftar/i)
    fireEvent.click(unregisteredBtn)

    // Manual input fields should be editable
    const nameInput = screen.getByPlaceholderText(/full name of offender|nama lengkap pelaku/i)
    expect(nameInput).not.toHaveAttribute("readonly")
    fireEvent.change(nameInput, { target: { value: "Agus Baru" } })

    const ktpInput = screen.getByPlaceholderText(/ktp or identity document number|nomor ktp atau dokumen identitas/i)
    expect(ktpInput).not.toHaveAttribute("readonly")
    fireEvent.change(ktpInput, { target: { value: "2171017777770001" } })

    const badgeInput = screen.getByPlaceholderText(/e\.g\. hid-1029|contoh: hid-1029/i)
    fireEvent.change(badgeInput, { target: { value: "HID-8899" } })

    const offencesInput = screen.getByPlaceholderText(/describe the violation|tuliskan bentuk pelanggaran/i)
    fireEvent.change(offencesInput, { target: { value: "Perusakan fasilitas gerbang utara" } })

    const companyInput = screen.getByPlaceholderText(/company \/ agency name|nama instansi\/perusahaan/i)
    fireEvent.change(companyInput, { target: { value: "PT Logistik Luar" } })

    // Submit
    const submitBtn = screen.getByRole("button", { name: /add to blacklist|tambahkan ke blacklist/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/visitors/blacklisted",
        expect.objectContaining({
          visitor_id: null,
          name: "Agus Baru",
          id_number: "2171017777770001",
          badge_code: "HID-8899",
          offences: "Perusakan fasilitas gerbang utara",
          company: "PT Logistik Luar",
        })
      )
    })
  })
})
