import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { BrowserRouter } from "react-router-dom"
import BlacklistedVisitors from "./BlacklistedVisitors"
import api from "@/lib/axios"

vi.mock("@/lib/axios")

const mockBlacklistData = [
  {
    id: 99,
    visitor_no: "VIS-2026-0099",
    id_type: "ktp",
    id_number: "2171019999990001",
    name: "Doni Kusuma",
    company: "PT Logistik Maju",
    is_blacklisted: true,
    blacklist_reason: "Melanggar SOP dermaga barat",
    blacklisted_at: "2026-07-20 14:00:00",
  },
]

describe("BlacklistedVisitors Master Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url")
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/export-count") || url.includes("/export/count")) {
        return Promise.resolve({ data: { count: 1 } })
      }
      if (url.includes("/export")) {
        return Promise.resolve({ data: new Blob(["excel data"]) })
      }
      return Promise.resolve({
        data: {
          data: mockBlacklistData,
          current_page: 1,
          last_page: 1,
          total: 1,
        },
      })
    })
  })

  it("renders blacklisted visitors with name, KTP, and offences", async () => {
    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Doni Kusuma")).toBeInTheDocument()
      expect(screen.getByText("2171019999990001")).toBeInTheDocument()
      expect(
        screen.getByText("Melanggar SOP dermaga barat")
      ).toBeInTheDocument()
    })
  })

  it("triggers unblacklist API call on confirmation", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: "Visitor removed from blacklist" },
    })

    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Doni Kusuma")).toBeInTheDocument()
    })

    const unblacklistBtn = screen.getByRole("button", {
      name: /cabut/i,
    })
    fireEvent.click(unblacklistBtn)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /pencabutan blacklist|remove from blacklist/i,
        })
      ).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole("button", {
      name: /cabut blacklist|ya, cabut|confirm/i,
    })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/visitors/99/unblacklist")
    })
  })

  it("opens add blacklist dialog when Tambah Blacklist button is clicked", async () => {
    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Doni Kusuma")).toBeInTheDocument()
    })

    const addBtn = screen.getByRole("button", { name: /tambah blacklist/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /tambah.*blacklist/i })
      ).toBeInTheDocument()
    })
  })

  it("queues a promotion to the global blacklist with a fixed category and a local note (hybrid PE-5)", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "o-1", status: "pending" } },
    })
    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    fireEvent.click(
      await screen.findByRole("button", { name: /naikkan ke global/i })
    )
    expect(
      await screen.findByRole("heading", {
        name: /naikkan ke blacklist global/i,
      })
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/kategori alasan/i), {
      target: { value: "misconduct" },
    })
    fireEvent.click(
      screen
        .getAllByRole("button", { name: /naikkan ke global/i })
        .at(-1) as HTMLElement
    )

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/global-blacklists", {
        visitor_id: 99,
        reason_category: "misconduct",
        local_note: "Melanggar SOP dermaga barat",
      })
    )
  })

  it("triggers export API call when Export Excel button is clicked", async () => {
    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Doni Kusuma")).toBeInTheDocument()
    })

    const exportBtn = screen.getByRole("button", { name: /export excel/i })
    fireEvent.click(exportBtn)

    const downloadBtn = await screen.findByRole("button", {
      name: /unduh file ekspor|download export/i,
    })
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/visitors/blacklisted/export",
        expect.anything()
      )
    })
  })

  it("imports blacklist file and automatically refreshes table with newly imported rows", async () => {
    let imported = false
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/visitors/blacklisted") {
        return Promise.resolve({
          data: {
            data: imported
              ? [
                  ...mockBlacklistData,
                  {
                    id: "bl-200",
                    visitor_id: "v-200",
                    id_number: "2171018888880002",
                    name: "Imported Offender",
                    badge_code: "HID-200",
                    offences: "Pelanggaran Import",
                    blacklisted_at: "2026-10-16",
                    remark: "Catatan Import",
                    company: "PT Import Jaya",
                    is_blacklisted: true,
                  },
                ]
              : mockBlacklistData,
            current_page: 1,
            last_page: 1,
            total: imported ? 2 : 1,
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    vi.mocked(api.post).mockImplementation((url: string) => {
      if (url === "/visitors/blacklisted/import-preview") {
        return Promise.resolve({
          data: {
            total_rows: 1,
            preview: [
              {
                _row: 2,
                _status: "new",
                name_of_offender: "Imported Offender",
                "badge_/_h.i.d_code": "HID-200",
                ktp_no: "2171018888880002",
                offences: "Pelanggaran Import",
                date: "2026-10-16",
                remark: "Catatan Import",
                company_name: "PT Import Jaya",
              },
            ],
            duplicates: [],
            duplicate_count: 0,
            new_count: 1,
            error_count: 0,
            errors: [],
          },
        })
      }
      if (url === "/visitors/blacklisted/import") {
        imported = true
        return Promise.resolve({
          data: {
            message: "Import selesai.",
            total: 1,
            success: 1,
            created: 1,
            updated: 0,
            replaced: 0,
            skipped_duplicates: 0,
            failed: 0,
            failed_details: [],
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    const { container } = render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Doni Kusuma")).toBeInTheDocument()
    })

    // Open Import Dialog
    fireEvent.click(screen.getByRole("button", { name: /import excel/i }))

    const fileInput = document.querySelector("#import-excel-file") as HTMLInputElement
    const testFile = new File(["dummy"], "blacklist.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    fireEvent.change(fileInput, { target: { files: [testFile] } })

    // Continue to Preview
    fireEvent.click(
      screen.getByRole("button", {
        name: /lanjut ke pratinjau|continue to preview/i,
      })
    )

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/visitors/blacklisted/import-preview",
        expect.any(FormData),
        expect.anything()
      )
    })

    // Execute Import
    fireEvent.click(
      await screen.findByRole("button", {
        name: /lanjutkan & eksekusi simpan|continue & execute import/i,
      })
    )

    // Verify import endpoint called and table automatically refreshed with the new row
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/visitors/blacklisted/import",
        expect.any(FormData),
        expect.anything()
      )
      expect(screen.getByText("Imported Offender")).toBeInTheDocument()
      expect(screen.getByText("2171018888880002")).toBeInTheDocument()
      expect(screen.getByText("HID-200")).toBeInTheDocument()
      expect(screen.getByText("PT Import Jaya")).toBeInTheDocument()
    })
    expect(container).toBeTruthy()
  })
})

