import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import MasterExportModal from "./MasterExportModal"
import { MASTER_ENTITIES } from "@/config/masterEntities"
import api from "@/lib/axios"

vi.mock("@/lib/axios")

describe("MasterExportModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/export-count") || url.includes("/export/count")) {
        return Promise.resolve({ data: { count: 42 } })
      }
      if (url.includes("/export")) {
        return Promise.resolve({
          data: new Blob(["dummy excel content"]),
          headers: {
            "content-disposition": 'attachment; filename="visitors_export.xlsx"',
          },
        })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it("renders simplified modal without scope radios and without date field selector", async () => {
    render(
      <MasterExportModal
        open={true}
        onOpenChange={vi.fn()}
        entityConfig={MASTER_ENTITIES.visitors}
        currentFilters={{ search: "Ahmad", visitor_type: "contractor" }}
      />
    )

    // Heading
    expect(
      screen.getByRole("heading", { name: /export visitors|ekspor master pengunjung/i })
    ).toBeInTheDocument()

    // Active filter banner notice
    expect(
      screen.getByText(/export akan menerapkan filter yang sedang aktif di tabel|export will apply currently active table filters/i)
    ).toBeInTheDocument()

    // Must NOT have Scope selector
    expect(screen.queryByText(/cakupan data|data scope/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/filter tabel saat ini|current table filters/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/semua data master|all master records/i)).not.toBeInTheDocument()

    // Must NOT have date field dropdown ("Berdasarkan:" / "Field:")
    expect(screen.queryByText(/^berdasarkan:$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^field:$/i)).not.toBeInTheDocument()

    // Shows date inputs
    expect(screen.getByLabelText(/start date|tanggal mulai/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end date|tanggal akhir/i)).toBeInTheDocument()

    // Live count preview shows 42
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument()
    })
  })

  it("passes active table filters and defaultDateField on export", async () => {
    render(
      <MasterExportModal
        open={true}
        onOpenChange={vi.fn()}
        entityConfig={MASTER_ENTITIES.visitors}
        currentFilters={{ search: "Ahmad", visitor_type: "contractor" }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument()
    })

    const downloadBtn = screen.getByRole("button", {
      name: /unduh file ekspor|download export/i,
    })
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/visitors/export",
        expect.objectContaining({
          params: expect.objectContaining({
            search: "Ahmad",
            visitor_type: "contractor",
            date_field: "created_at",
            format: "xlsx",
          }),
        })
      )
    })
  })

  it("uses entity-specific defaultDateField for blacklist (blacklisted_at)", async () => {
    render(
      <MasterExportModal
        open={true}
        onOpenChange={vi.fn()}
        entityConfig={MASTER_ENTITIES.blacklist}
        currentFilters={{ search: "Offender1" }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument()
    })

    const downloadBtn = screen.getByRole("button", {
      name: /unduh file ekspor|download export/i,
    })
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/visitors/blacklisted/export",
        expect.objectContaining({
          params: expect.objectContaining({
            search: "Offender1",
            date_field: "blacklisted_at",
          }),
        })
      )
    })
  })
})
