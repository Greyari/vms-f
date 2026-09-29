import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import SyncIndicator from "./SyncIndicator"
import api from "@/lib/axios"

vi.mock("@/lib/axios")

const status = (overrides: Record<string, unknown> = {}) => ({
  enabled: true,
  yard_code: "CIS",
  level: "green",
  minutes_since_sync: 2,
  pending_outbox: 0,
  channels: [],
  ...overrides,
})

describe("SyncIndicator (hybrid FE-4c)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows green with the minutes since the last sync", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: status() })
    render(<SyncIndicator />)

    expect(await screen.findByText("Sinkron")).toBeInTheDocument()
    expect(
      screen.getByText(/terakhir sinkron 2 menit lalu/i)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /sync sekarang/i })
    ).not.toBeInTheDocument()
  })

  it("shows red when it never synced and counts queued requests", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: status({
        level: "red",
        minutes_since_sync: null,
        pending_outbox: 3,
      }),
    })
    render(<SyncIndicator />)

    expect(await screen.findByText("Tidak sinkron")).toBeInTheDocument()
    expect(screen.getByText(/belum pernah sinkron/i)).toBeInTheDocument()
    expect(screen.getByText(/3 antre/)).toBeInTheDocument()
  })

  it("says the gate runs without the hub while sync is off", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: status({ enabled: false, level: "off", minutes_since_sync: null }),
    })
    render(<SyncIndicator canRun />)

    expect(await screen.findByText("Sync cloud mati")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /sync sekarang/i })
    ).not.toBeInTheDocument()
  })

  it("lets a supervisor run a cycle now", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: status({ level: "yellow", minutes_since_sync: 12 }),
    })
    vi.mocked(api.post).mockResolvedValue({ data: status() })
    render(<SyncIndicator canRun />)

    fireEvent.click(
      await screen.findByRole("button", { name: /sync sekarang/i })
    )

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/sync/run"))
    expect(await screen.findByText("Sinkron")).toBeInTheDocument()
  })

  it("stays hidden when the answer is not a sync status", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    render(<SyncIndicator />)

    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/sync/status"))
    expect(screen.queryByTestId("sync-indicator")).not.toBeInTheDocument()
  })
})
