import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import EditVisitModal from "./EditVisitModal"
import { resetCreateVisitCache } from "./VisitFormShared"
import api from "@/lib/axios"

vi.mock("@/lib/axios")

const mockOnClose = vi.fn()
const mockOnSuccess = vi.fn()

const dummyVisit = {
  id: "0195f3a0-0001-7000-8000-000000000201",
  ticket_number: "26/09/00099",
  visitor_cards: [
    { id: "0195f3a0-0001-7000-8000-000000000050", card_no: "V-050" },
  ],
  visitor: {
    id: "0195f3a0-0001-7000-8000-000000000010",
    name: "Bambang Supriyanto",
    id_type: "ktp",
    id_number: "2171010101010001",
    company: "PT Samudera",
  },
  visitor_company: "PT Samudera",
  location_id: "0195f3a0-0001-7000-8000-000000000001",
  location_name: "Dermaga Barat",
  staff_id: "0195f3a0-0001-7000-8000-000000000100",
  staff: { id: "0195f3a0-0001-7000-8000-000000000100", name: "Budi Hartono" },
  host_name: "Budi Hartono",
  purpose: "Audit Tahunan",
  vehicle_no: "BP 1111 AA",
  vehicle_card_id: "0195f3a0-0001-7000-8000-000000000060",
  vehicle_card: {
    id: "0195f3a0-0001-7000-8000-000000000060",
    card_no: "VEH-060",
  },
  checked_out_at: null,
}

describe("EditVisitModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCreateVisitCache()

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/locations")) {
        return Promise.resolve({
          data: [
            {
              id: "0195f3a0-0001-7000-8000-000000000001",
              name: "Dermaga Barat",
              type: "location",
            },
            {
              id: "0195f3a0-0001-7000-8000-000000000002",
              name: "Dok Kolam 2",
              type: "location",
            },
          ],
        })
      }
      if (url.includes("/staffs")) {
        return Promise.resolve({
          data: [
            {
              id: "0195f3a0-0001-7000-8000-000000000100",
              name: "Budi Hartono",
              department: "QA",
            },
            {
              id: "0195f3a0-0001-7000-8000-000000000101",
              name: "Siti Rahma",
              department: "HSE",
            },
          ],
        })
      }
      if (url.includes("/cards")) {
        return Promise.resolve({
          data: [
            {
              id: "0195f3a0-0001-7000-8000-000000000050",
              card_no: "V-050",
              status: "in_use",
            },
            {
              id: "0195f3a0-0001-7000-8000-000000000051",
              card_no: "V-051",
              status: "available",
            },
            {
              id: "0195f3a0-0001-7000-8000-000000000052",
              card_no: "V-OTHER-IN-USE",
              status: "in_use",
            },
          ],
        })
      }
      if (url.includes("/vehicle-cards")) {
        return Promise.resolve({
          data: [
            {
              id: "0195f3a0-0001-7000-8000-000000000060",
              card_no: "VEH-060",
              status: "in_use",
            },
            {
              id: "0195f3a0-0001-7000-8000-000000000061",
              card_no: "VEH-OTHER-BUSY",
              status: "in_use",
            },
          ],
        })
      }
      if (url.includes("/lookups/purposes")) {
        return Promise.resolve({ data: ["Meeting", "Audit"] })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it("renders modal with pre-populated visit data and filters out cards used by other visits", async () => {
    render(
      <EditVisitModal
        visit={dummyVisit}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText(/edit kunjungan (terbuka|aktif)|edit (open|active) visit/i)
      ).toBeInTheDocument()
      expect(screen.getByDisplayValue("Audit Tahunan")).toBeInTheDocument()
      expect(screen.getByDisplayValue("PT Samudera")).toBeInTheDocument()
      expect(screen.getByDisplayValue("BP 1111 AA")).toBeInTheDocument()
      expect(screen.getByText("V-050")).toBeInTheDocument()
      expect(screen.getByDisplayValue("VEH-060")).toBeInTheDocument()
      expect(screen.queryByText("V-OTHER-IN-USE")).not.toBeInTheDocument()
      expect(screen.queryByText("VEH-OTHER-BUSY")).not.toBeInTheDocument()
    })
  })

  it("submits updated values via PUT /api/visits/:id", async () => {
    vi.mocked(api.put).mockResolvedValueOnce({
      data: { message: "Visit updated successfully" },
    })

    render(
      <EditVisitModal
        visit={dummyVisit}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("Audit Tahunan")).toBeInTheDocument()
    })

    fireEvent.change(
      screen.getByLabelText(/tujuan kunjungan|purpose of visit/i),
      {
        target: { value: "Inspeksi Mesin Baru" },
      }
    )
    fireEvent.change(screen.getByLabelText(/perusahaan|company/i), {
      target: { value: "PT Samudera Logistik" },
    })

    fireEvent.click(
      screen.getByRole("button", { name: /simpan perubahan|save changes/i })
    )

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        `/visits/${dummyVisit.id}`,
        expect.objectContaining({
          purpose: "Inspeksi Mesin Baru",
          visitor_company: "PT Samudera Logistik",
          vehicle_no: "BP 1111 AA",
          card_ids: ["0195f3a0-0001-7000-8000-000000000050"],
          vehicle_card_id: "0195f3a0-0001-7000-8000-000000000060",
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it("handles 422 error when visit is already closed and calls onClose", async () => {
    vi.mocked(api.put).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          error_code: "visit_already_checked_out",
          message: "Cannot update a visit that has already been checked out",
        },
      },
    })

    render(
      <EditVisitModal
        visit={dummyVisit}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("Audit Tahunan")).toBeInTheDocument()
    })

    fireEvent.click(
      screen.getByRole("button", { name: /simpan perubahan|save changes/i })
    )

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
