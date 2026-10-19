import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import CreateVisit from "./CreateVisit"
import api from "@/lib/axios"

const mockNavigate = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/lib/axios")

describe("CreateVisit Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/locations")) {
        return Promise.resolve({
          data: [{ id: 1, name: "Dermaga 1", is_active: true }],
        })
      }
      if (url.includes("/staffs")) {
        return Promise.resolve({
          data: [{ id: 10, name: "Budi Santoso", department: "Engineering" }],
        })
      }
      if (url.includes("/cards")) {
        return Promise.resolve({
          data: [
            {
              id: 20,
              card_no: "V-001",
              card_type: "visitor",
              status: "available",
            },
          ],
        })
      }
      if (url.includes("/vehicle-cards")) {
        return Promise.resolve({
          data: [
            {
              id: 30,
              card_no: "VEH-001",
              card_type: "vehicle",
              status: "available",
            },
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

  it("detects new visitor when check-ktp returns null", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/visitors/check-ktp/1234567890123456")) {
        return Promise.resolve({ data: { data: null } })
      }
      if (url.includes("/locations"))
        return Promise.resolve({ data: [{ id: 1, name: "Dermaga 1" }] })
      if (url.includes("/staffs"))
        return Promise.resolve({ data: [{ id: 10, name: "Budi" }] })
      if (url.includes("/cards"))
        return Promise.resolve({
          data: [{ id: 20, card_no: "V-001", status: "available" }],
        })
      return Promise.resolve({ data: [] })
    })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    const idInput = screen.getByLabelText(/id number/i)
    fireEvent.change(idInput, { target: { value: "1234567890123456" } })

    const checkButton = screen.getByRole("button", { name: /check|search/i })
    fireEvent.click(checkButton)

    await waitFor(() => {
      expect(screen.getByText(/new visitor/i)).toBeInTheDocument()
    })
  })

  it("blocks submit and shows alert when visitor is blacklisted", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/visitors/check-ktp/9999999999999999")) {
        return Promise.resolve({
          data: {
            data: {
              id: 99,
              name: "Blacklisted Tamu",
              is_blacklisted: true,
              blacklist_reason: "Violation of security protocol",
              company: "PT Rogue",
            },
          },
        })
      }
      if (url.includes("/locations"))
        return Promise.resolve({ data: [{ id: 1, name: "Dermaga 1" }] })
      if (url.includes("/staffs"))
        return Promise.resolve({ data: [{ id: 10, name: "Budi" }] })
      if (url.includes("/cards"))
        return Promise.resolve({
          data: [{ id: 20, card_no: "V-001", status: "available" }],
        })
      return Promise.resolve({ data: [] })
    })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: "9999999999999999" },
    })
    fireEvent.click(screen.getByRole("button", { name: /check|search/i }))

    await waitFor(() => {
      expect(screen.getByText(/blacklisted/i)).toBeInTheDocument()
      expect(
        screen.getByText(/violation of security protocol/i)
      ).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole("button", {
      name: /save & print ticket/i,
    })
    expect(submitBtn).toBeDisabled()
  })

  const masterData = (url: string) => {
    if (url.includes("/locations"))
      return Promise.resolve({ data: [{ id: 1, name: "Dermaga 1" }] })
    if (url.includes("/staffs"))
      return Promise.resolve({ data: [{ id: 10, name: "Budi" }] })
    if (url.includes("/cards"))
      return Promise.resolve({
        data: [{ id: 20, card_no: "V-001", status: "available" }],
      })
    return Promise.resolve({ data: [] })
  }

  it("loads a scanned pre-registration, asks for gender, and sends its token (hybrid FE-4a)", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/pre-registrations/PR-AAAA-BBBB-CCCC")) {
        return Promise.resolve({
          data: {
            data: {
              token: "PR-AAAA-BBBB-CCCC",
              id_type: "ktp",
              id_number: "3210000000000009",
              name: "Siti Aminah",
              company: "PT Contoh",
              phone: "0812",
              gender: null,
              purpose: "Survey",
              host_name: "Pak Andi",
              host_department: null,
              scheduled_date: "2026-10-01",
              vehicle_no: "BP 1234 XY",
              status: "pending",
            },
          },
        })
      }
      if (url.includes("/visitors/check-ktp/"))
        return Promise.resolve({ data: { data: null, global_blacklist: [] } })
      return masterData(url)
    })
    vi.mocked(api.post).mockResolvedValue({ data: { visit: { id: "v-1" } } })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/kode pra-registrasi/i), {
      target: { value: "pr-aaaa-bbbb-cccc" },
    })
    fireEvent.click(screen.getByRole("button", { name: /muat/i }))

    await waitFor(() =>
      expect(screen.getByDisplayValue("Siti Aminah")).toBeInTheDocument()
    )
    expect(screen.getByDisplayValue("BP 1234 XY")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "1" },
    })
    fireEvent.change(screen.getByLabelText(/jenis kelamin/i), {
      target: { value: "F" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: /save & print ticket/i })
    )

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/visits",
        expect.objectContaining({
          pre_registration_token: "PR-AAAA-BBBB-CCCC",
          gender: "F",
          vehicle_no: "BP 1234 XY",
          host_name: "Pak Andi",
        })
      )
    )
  })

  it("shows the global blacklist block and lets a supervisor override one visit (hybrid SEC-7)", async () => {
    const hit = {
      id_type: "ktp",
      name: "Budi",
      reason_category: "k3_violation",
      reason_label: "Pelanggaran K3",
      registered_by_yard: "ASL",
    }
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/visitors/check-ktp/"))
        return Promise.resolve({
          data: { data: null, global_blacklist: [hit] },
        })
      return masterData(url)
    })
    vi.mocked(api.post)
      .mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            message: "This visitor is on the global blacklist.",
            global_blacklist: hit,
            can_override: true,
          },
        },
      })
      .mockResolvedValueOnce({ data: { visit: { id: "v-2" } } })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: "3210000000000001" },
    })
    fireEvent.click(screen.getByRole("button", { name: /check|search/i }))
    expect(await screen.findByText("BLACKLIST GLOBAL")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/visitor name/i), {
      target: { value: "Budi" },
    })
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "1" },
    })
    fireEvent.change(screen.getByLabelText(/purpose of visit/i), {
      target: { value: "Delivery" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: /save & print ticket/i })
    )

    expect(
      await screen.findByRole("heading", { name: /loloskan satu kunjungan/i })
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/alasan/i), {
      target: { value: "Dikonfirmasi ASL: salah orang" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: /loloskan & check-in/i })
    )

    await waitFor(() =>
      expect(api.post).toHaveBeenLastCalledWith(
        "/visits",
        expect.objectContaining({
          override_global_blacklist: true,
          override_reason: "Dikonfirmasi ASL: salah orang",
        })
      )
    )
  })

  it("warns without blocking when the number is listed under another document type (hybrid SEC-4)", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/visitors/check-ktp/")) {
        return Promise.resolve({
          data: {
            data: null,
            global_blacklist: [
              {
                id_type: "passport",
                name: "X",
                reason_category: "other",
                reason_label: "Lainnya",
                registered_by_yard: "ASL",
              },
            ],
          },
        })
      }
      return masterData(url)
    })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: "3210000000000001" },
    })
    fireEvent.click(screen.getByRole("button", { name: /check|search/i }))

    expect(await screen.findByText(/sebagai PASSPORT/)).toBeInTheDocument()
    expect(screen.queryByText("BLACKLIST GLOBAL")).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /save & print ticket/i })
    ).not.toBeDisabled()
  })

  it("shows close_open_visits confirmation dialog on 422 conflict and retries", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/visitors/check-ktp/1111222233334444")) {
        return Promise.resolve({
          data: {
            data: {
              id: 5,
              name: "Active Visitor Tamu",
              is_blacklisted: false,
              company: "PT Maju",
            },
          },
        })
      }
      if (url.includes("/locations"))
        return Promise.resolve({ data: [{ id: 1, name: "Dermaga 1" }] })
      if (url.includes("/staffs"))
        return Promise.resolve({ data: [{ id: 10, name: "Budi" }] })
      if (url.includes("/cards"))
        return Promise.resolve({
          data: [{ id: 20, card_no: "V-001", status: "available" }],
        })
      return Promise.resolve({ data: [] })
    })

    // First POST fails with 422 open visits conflict
    vi.mocked(api.post)
      .mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            message:
              "Pengunjung ini masih memiliki kunjungan terbuka (open visit).",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          message: "Visit created",
          visit: { id: 101, ticket_number: "26/09/00001" },
        },
      })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: "1111222233334444" },
    })
    fireEvent.click(screen.getByRole("button", { name: /check|search/i }))

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Active Visitor Tamu")
      ).toBeInTheDocument()
    })

    // Fill mandatory location & purpose
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "1" },
    })
    fireEvent.change(screen.getByLabelText(/purpose of visit/i), {
      target: { value: "Meeting Vendor" },
    })

    // Submit form
    fireEvent.click(
      screen.getByRole("button", { name: /save & print ticket/i })
    )

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
    })

    // Modal dialog should appear
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /kunjungan terbuka terdeteksi/i })
      ).toBeInTheDocument()
    })

    // Confirm close and check-in
    const confirmBtn = screen.getByRole("button", {
      name: /tutup kunjungan lama/i,
    })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenLastCalledWith(
        "/visits",
        expect.objectContaining({
          close_open_visits: true,
        })
      )
      expect(mockNavigate).toHaveBeenCalledWith("/visits/101/print", {
        state: { visit: { id: 101, ticket_number: "26/09/00001" } },
      })
    })
  })

  it("displays Vessel Info Card (Captain, Note/PIC, Call Sign, Flag) when a vessel is selected and sets Captain as Host", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/locations")) {
        return Promise.resolve({
          data: [
            { id: "loc-land-1", name: "Main Office", type: "location", is_active: true },
            {
              id: "vessel-widuri",
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
      return masterData(url)
    })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
      expect(screen.getByText(/GAS WIDURI/i)).toBeInTheDocument()
    })

    // Initially land location is selected -> no vessel info card
    expect(screen.queryByRole("region", { name: /informasi kapal tujuan/i })).not.toBeInTheDocument()

    // Select vessel GAS WIDURI
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "vessel-widuri" },
    })

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /informasi kapal tujuan/i })).toBeInTheDocument()
      expect(screen.getByText("CAPT. SUTRISNO")).toBeInTheDocument()
      expect(screen.getByText("ALVI")).toBeInTheDocument()
      expect(screen.getAllByText("LPG TANKER").length).toBeGreaterThan(0)
      expect(screen.getByText("POJR")).toBeInTheDocument()
    })

    // Click "+ Jadikan Captain sebagai Host"
    fireEvent.click(screen.getByRole("button", { name: /jadikan captain sebagai host/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue("CAPT. SUTRISNO")).toBeInTheDocument()
    })
  })

  it("supports Crew Kapal visit mode with crew document fields and auto-assignment payload", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/locations")) {
        return Promise.resolve({
          data: [
            {
              id: "vessel-widuri",
              name: "GAS WIDURI",
              code: "9764790",
              type: "repair_vessel",
              vessel_type: "LPG TANKER",
              captain: "CAPT. SUTRISNO",
              pic: "ALVI",
              is_active: true,
            },
          ],
        })
      }
      return masterData(url)
    })

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        message: "Visit created",
        visit: { id: "visit-crew-1", ticket_number: "26/10/00099" },
      },
    })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/tipe pengunjung/i)).toBeInTheDocument()
      expect(screen.getByText(/GAS WIDURI/i)).toBeInTheDocument()
    })

    // Switch visitor_type to "crew"
    fireEvent.change(screen.getByLabelText(/tipe pengunjung/i), {
      target: { value: "crew" },
    })

    expect(
      await screen.findByText(/mode kunjungan kru kapal/i)
    ).toBeInTheDocument()

    // Fill crew details
    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: "3201999988887777" },
    })
    fireEvent.change(screen.getByLabelText(/visitor name/i), {
      target: { value: "Rudi Hartono" },
    })
    fireEvent.change(screen.getByLabelText(/jabatan \/ rank di kapal/i), {
      target: { value: "Chief Engineer" },
    })
    fireEvent.change(screen.getByLabelText(/no\. buku pelaut/i), {
      target: { value: "SB-998877" },
    })
    fireEvent.change(screen.getByLabelText(/no\. sertifikat/i), {
      target: { value: "COC-112233" },
    })

    // Select vessel GAS WIDURI
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: "vessel-widuri" },
    })

    // Submit form
    fireEvent.click(
      screen.getByRole("button", { name: /save & print ticket/i })
    )

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/visits",
        expect.objectContaining({
          visitor_type: "crew",
          name: "Rudi Hartono",
          occupation: "Chief Engineer",
          seaman_book_no: "SB-998877",
          certificate_no: "COC-112233",
          location_id: "vessel-widuri",
          vessel_id: "vessel-widuri",
        })
      )
    })
  })

  it("fetches all available cards with per_page=1000 and allows submitting a visit without selecting a visitor card", async () => {
    const manyCards = Array.from({ length: 155 }, (_, i) => ({
      id: `card-${i + 1}`,
      card_no: `VIS-${String(i + 1).padStart(3, "0")}`,
      status: "available",
    }))

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/locations")) {
        return Promise.resolve({
          data: [{ id: 1, name: "Dermaga 1", type: "location", is_active: true }],
        })
      }
      if (url.includes("/staffs")) {
        return Promise.resolve({
          data: [
            {
              id: 10,
              staff_id: "KPK0211",
              name: "Slamet Riyadi",
              company: "KPK",
              address: "PERUM PURI MAS BLOK B3 NO 19 BATU AJI BATAM KEPULAUAN RIAU",
            },
          ],
        })
      }
      if (url.includes("/cards")) {
        return Promise.resolve({ data: manyCards })
      }
      if (url.includes("/vehicle-cards")) {
        return Promise.resolve({
          data: [{ id: 30, card_no: "VEH-001", status: "available" }],
        })
      }
      return Promise.resolve({ data: [] })
    })

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        message: "Visit created",
        visit: { id: "visit-no-card", ticket_number: "26/10/00105" },
      },
    })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/cards", {
        params: { per_page: 1000 },
      })
      expect(screen.getByText("155 kartu tersedia")).toBeInTheDocument()
    })

    // Fill visitor identity & purpose without selecting any visitor card
    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: "3201000011112222" },
    })
    fireEvent.change(screen.getByLabelText(/visitor name/i), {
      target: { value: "Tamu Kartu Mobil Saja" },
    })
    fireEvent.change(screen.getByLabelText(/purpose of visit/i), {
      target: { value: "Antar Barang" },
    })

    fireEvent.click(
      screen.getByRole("button", { name: /save & print ticket/i })
    )

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/visits",
        expect.objectContaining({
          name: "Tamu Kartu Mobil Saja",
          card_ids: [],
        })
      )
    })
  })
})

