import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import GlobalBlacklistPanel from "./GlobalBlacklistPanel"
import api from "@/lib/axios"

vi.mock("@/lib/axios")

const entries = [
  {
    id: "e-1",
    id_type: "ktp",
    id_number: "3210000000000001",
    name: "Budi Ours",
    reason_category: "k3_violation",
    reason_label: "Pelanggaran K3",
    registered_by_yard: "CIS",
    is_active: true,
    can_revoke: true,
    updated_at: null,
  },
  {
    id: "e-2",
    id_type: "passport",
    id_number: "A1234567",
    name: "Joko Theirs",
    reason_category: "misconduct",
    reason_label: "Perilaku tidak pantas",
    registered_by_yard: "ASL",
    is_active: true,
    can_revoke: false,
    updated_at: null,
  },
]

const outbox = [
  {
    id: "o-1",
    action: "revoke",
    id_type: "ktp",
    id_number: "999",
    name: "Rejected One",
    reason_label: null,
    local_note: "Dicabut manajemen",
    requested_by: "Supervisor",
    status: "rejected",
    attempts: 1,
    last_error: "Only the yard that registered this entry can revoke it.",
    created_at: null,
    sent_at: null,
  },
]

describe("GlobalBlacklistPanel (hybrid FE-4b)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) =>
      Promise.resolve(
        url.includes("/outbox")
          ? { data: { data: outbox } }
          : { data: { data: entries, total: 2 } }
      )
    )
  })

  it("lists global entries and offers revocation only for this yard", async () => {
    render(<GlobalBlacklistPanel />)

    const ours = (await screen.findByText("Budi Ours")).closest(
      "tr"
    ) as HTMLElement
    const theirs = screen.getByText("Joko Theirs").closest("tr") as HTMLElement

    expect(
      within(ours).getByRole("button", { name: /cabut global/i })
    ).toBeInTheDocument()
    expect(
      within(theirs).queryByRole("button", { name: /cabut global/i })
    ).not.toBeInTheDocument()
    expect(
      within(theirs).getByText(/hanya ASL yang bisa mencabut/i)
    ).toBeInTheDocument()
  })

  it("shows the outbox with the hub refusal", async () => {
    render(<GlobalBlacklistPanel />)

    expect(await screen.findByText("Rejected One")).toBeInTheDocument()
    expect(screen.getByText("Ditolak hub")).toBeInTheDocument()
    expect(
      screen.getByText(/only the yard that registered/i)
    ).toBeInTheDocument()
  })

  it("queues a revocation with a local note", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "o-2", status: "pending" } },
    })
    render(<GlobalBlacklistPanel />)

    const ours = (await screen.findByText("Budi Ours")).closest(
      "tr"
    ) as HTMLElement
    fireEvent.click(within(ours).getByRole("button", { name: /cabut global/i }))

    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText(/alasan pencabutan/i), {
      target: { value: "Keputusan manajemen" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: /cabut global/i })
    )

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/global-blacklists/e-1/revoke", {
        local_note: "Keputusan manajemen",
      })
    )
  })
})
