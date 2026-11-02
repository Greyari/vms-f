import { render, screen, fireEvent, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import AppOverview from "./AppOverview"
import { APP_OVERVIEW_WORKFLOWS } from "@/config/appOverview"
import * as AuthContextModule from "@/context/AuthContext"
import * as UseAppTourModule from "@/hooks/useAppTour"
import { APP_TOURS } from "@/config/appTours"
import { I18nProvider, useTranslation } from "@/context/I18nContext"
import type { User } from "@/types/auth"

const mockDrive = vi.fn()
const mockDestroy = vi.fn()
const mockDriver = vi.fn((_config?: any) => ({
  drive: mockDrive,
  destroy: mockDestroy,
  isActive: () => false,
}))

vi.mock("driver.js", () => ({
  driver: (config: unknown) => mockDriver(config),
}))

function LanguageToggleTester() {
  const { setLanguage } = useTranslation()
  return (
    <div>
      <button type="button" onClick={() => setLanguage("en")}>
        Switch to EN
      </button>
      <AppOverview />
    </div>
  )
}

describe("AppOverview Page", () => {
  const setupUser = (permissions: string[], role = "security") => {
    const user: User = {
      id: 1,
      name: "Gate Officer",
      username: "SEC01",
      roles: [role],
      permissions,
    }
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user,
      token: "mock-token",
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r: string) => r === role,
      hasPermission: (p: string) => permissions.includes(p),
      loading: false,
    })
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("renders all 18 application page cards and general tips", () => {
    setupUser(["view_visits", "create_visits", "checkout_visits"])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { level: 1, name: "Panduan Aplikasi" })
    ).toBeInTheDocument()

    const expectedTitles = [
      "Dashboard",
      "Tambah Kunjungan",
      "Riwayat Kunjungan",
      "Kedatangan Kru",
      "Lokasi & Kapal",
      "Staf Pegawai",
      "Kartu Pengunjung",
      "Kartu Kendaraan",
      "Daftar Pengunjung",
      "Temporary Blacklist",
      "Laporan Kunjungan",
      "Laporan Kapal",
      "Laporan Kru Kapal",
      "Pengguna Sistem",
      "Log Aktivitas",
      "Manajemen Peran",
      "Profil Saya",
      "Panduan Aplikasi",
    ]

    for (const title of expectedTitles) {
      expect(
        screen.getByRole("heading", { level: 3, name: title })
      ).toBeInTheDocument()
    }

    expect(
      screen.getByRole("heading", { level: 2, name: "Tips Umum" })
    ).toBeInTheDocument()
  })

  it("shows open page links only for pages permitted to the current user", () => {
    setupUser(["view_visits", "create_visits"])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    // Permitted for security: /, /visits/create, /visits/history, /settings/profile, /settings/overview (5 pages)
    const openLinks = screen.getAllByRole("link", { name: /Buka halaman/i })
    expect(openLinks).toHaveLength(5)

    const hrefs = openLinks.map((link) => link.getAttribute("href"))
    expect(hrefs).toEqual([
      "/",
      "/visits/create",
      "/visits/history",
      "/settings/profile",
      "/settings/overview",
    ])

    // Remaining 13 pages show "Tidak ada akses"
    const deniedBadges = screen.getAllByText("Tidak ada akses")
    expect(deniedBadges).toHaveLength(13)
  })

  it("filters page cards based on search query and resets search", () => {
    setupUser(["view_visits", "create_visits"])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    const searchInput = screen.getByLabelText("Cari halaman atau fitur")
    fireEvent.change(searchInput, { target: { value: "Blacklist" } })

    expect(
      screen.getByRole("heading", { level: 3, name: "Temporary Blacklist" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { level: 3, name: "Staf Pegawai" })
    ).not.toBeInTheDocument()

    // Search with no matches
    fireEvent.change(searchInput, {
      target: { value: "kata-kunci-tidak-ada-999" },
    })
    expect(
      screen.getByText(/Tidak ada halaman atau fitur yang cocok/i)
    ).toBeInTheDocument()

    const resetBtn = screen.getByRole("button", {
      name: "Tampilkan Semua Halaman",
    })
    fireEvent.click(resetBtn)

    expect(
      screen.getByRole("heading", { level: 3, name: "Staf Pegawai" })
    ).toBeInTheDocument()
  })

  it("switches text to English when language is changed to EN", () => {
    setupUser(["view_visits", "create_visits"])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <LanguageToggleTester />
        </I18nProvider>
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { level: 1, name: "Panduan Aplikasi" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Switch to EN" }))

    expect(
      screen.getByRole("heading", { level: 1, name: "App Overview" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 3, name: "Locations & Vessels" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 2, name: "General Tips" })
    ).toBeInTheDocument()
  })

  it("(a) displays 'Tambah kunjungan' step-by-step guide after expanding toggle with a 'Coba Sekarang' link to /visits/create", () => {
    setupUser(["view_visits", "create_visits", "checkout_visits"])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    const addVisitHeading = screen.getByRole("heading", {
      level: 3,
      name: "Tambah Kunjungan",
    })
    const addVisitCard = addVisitHeading.closest("article")!

    // Default closed
    expect(
      within(addVisitCard).queryByRole("heading", {
        level: 4,
        name: "Tambah kunjungan",
      })
    ).not.toBeInTheDocument()

    const toggleBtn = within(addVisitCard).getByRole("button", {
      name: /Lihat Panduan/i,
    })
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true")

    expect(
      within(addVisitCard).getByRole("heading", {
        level: 4,
        name: "Tambah kunjungan",
      })
    ).toBeInTheDocument()

    const tryNowLink = within(addVisitCard).getByRole("link", {
      name: /Coba Sekarang/i,
    })
    expect(tryNowLink).toHaveAttribute("href", "/visits/create")
  })

  it("(b) matches search query against guide step content and auto-expands the guide section", () => {
    setupUser([
      "view_visits",
      "create_visits",
      "checkout_visits",
      "view_vessel_arrivals",
    ])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    const searchInput = screen.getByLabelText("Cari halaman atau fitur")
    // "gerbang keluar" only appears in the checkout guide tip/step of Riwayat Kunjungan
    fireEvent.change(searchInput, { target: { value: "gerbang keluar" } })

    expect(
      screen.getByRole("heading", { level: 3, name: "Riwayat Kunjungan" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { level: 3, name: "Staf Pegawai" })
    ).not.toBeInTheDocument()

    // Guide section auto-opened because search matched guide content
    expect(
      screen.getByRole("heading", { level: 4, name: "Check-out kunjungan" })
    ).toBeInTheDocument()
  })

  it("(c) does not render guide toggle or 'Coba Sekarang' link for pages the user cannot access", () => {
    // Security user has no view_vessel_arrivals permission
    setupUser(["view_visits", "create_visits"])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    const crewArrivalsHeading = screen.getByRole("heading", {
      level: 3,
      name: "Kedatangan Kru",
    })
    const crewArrivalsCard = crewArrivalsHeading.closest("article")!

    expect(
      within(crewArrivalsCard).queryByRole("button", { name: /Lihat Panduan/i })
    ).not.toBeInTheDocument()
    expect(
      within(crewArrivalsCard).queryByRole("link", { name: /Coba Sekarang/i })
    ).not.toBeInTheDocument()
  })

  it("(d) renders guide titles and simulator tabs in English when language mode is EN", () => {
    setupUser(["view_visits", "create_visits"])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="en">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    // FIX: the old level-4 simulator heading no longer exists.
    // The simulator is now identified by its tabs in the window caption.
    expect(
      screen.getByRole("tab", { name: /1\. Registration & Print Pass/i })
    ).toBeInTheDocument()

    const addVisitHeading = screen.getByRole("heading", {
      level: 3,
      name: "Add Visit",
    })
    const addVisitCard = addVisitHeading.closest("article")!

    const toggleBtn = within(addVisitCard).getByRole("button", {
      name: /Show Guides/i,
    })
    fireEvent.click(toggleBtn)

    expect(
      within(addVisitCard).getByRole("heading", {
        level: 4,
        name: "Register a new visit",
      })
    ).toBeInTheDocument()

    expect(
      within(addVisitCard).getByRole("link", { name: /Try Now/i })
    ).toHaveAttribute("href", "/visits/create")
  })

  it("(e) clicking 'Mulai Tur' button calls startTour with the selected tourId", () => {
    setupUser(["view_visits", "create_visits"])
    const mockStartTour = vi.fn(() => [])

    vi.spyOn(UseAppTourModule, "useAppTour").mockReturnValue({
      availableTours: APP_TOURS,
      startTour: mockStartTour,
      isTourDone: () => false,
      completedTours: {},
    })

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    const startBtn = screen.getByRole("button", { name: "Mulai Tur" })
    fireEvent.click(startBtn)

    expect(mockStartTour).toHaveBeenCalledTimes(1)
    expect(mockStartTour).toHaveBeenCalledWith("tour-welcome")
  })

  it("(f) does not auto-start tour-welcome when localStorage already marks it as completed", () => {
    setupUser(["view_visits", "create_visits"])
    localStorage.setItem("vms_tour_done:1:tour-welcome", "true")

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    expect(mockDriver).not.toHaveBeenCalled()
    expect(mockDrive).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: /Ulangi Tur/i })
    ).toBeInTheDocument()
  })

  it("(g) filters out tour steps whose requiredPermission is not held by the user", () => {
    // User does NOT have 'create_visits' permission
    setupUser(["view_visits"])
    localStorage.setItem("vms_tour_done:1:tour-welcome", "true")

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    const startBtn = screen.getByRole("button", { name: "Mulai Tur" })
    fireEvent.click(startBtn)

    expect(mockDriver).toHaveBeenCalledTimes(1)
    const driverConfig = ((mockDriver.mock.calls as any)[0][0] ?? {}) as {
      steps: Array<{ element: string }>
    }
    const highlightedSelectors = driverConfig.steps.map((s) => s.element)

    // Step targeting overview-search is included, but overview-card-add-visit (requires create_visits) is filtered out
    expect(highlightedSelectors).toContain('[data-tour="overview-search"]')
    expect(highlightedSelectors).not.toContain(
      '[data-tour="overview-card-add-visit"]'
    )
  })


  it("(i) interactive visual simulator allows practicing visit pass printing, check-out card release, and crew manifest actions", () => {
    setupUser(["view_visits", "create_visits", "checkout_visits"])

    render(
      <MemoryRouter>
        <I18nProvider initialLanguage="id">
          <AppOverview />
        </I18nProvider>
      </MemoryRouter>
    )

    // FIX: the old level-4 simulator heading no longer exists.
    // The simulator is now identified by its first tab.
    expect(
      screen.getByRole("tab", { name: /1\. Registrasi & Cetak Pass/i })
    ).toBeInTheDocument()

    // Tab 1: Click 'Simpan & Cetak Tiket (Simulasi)' and verify ½ A4 pass preview appears
    const printSimBtn = screen.getByRole("button", {
      name: /Simpan & Cetak Tiket \(Simulasi\)/i,
    })
    fireEvent.click(printSimBtn)
    expect(
      screen.getByText("Contoh Hasil Cetak Tiket Visitor Pass ½ A4")
    ).toBeInTheDocument()

    // Switch to Tab 2: Riwayat & Check-out
    const historyTab = screen.getByRole("tab", {
      name: /2\. Riwayat & Check-out/i,
    })
    fireEvent.click(historyTab)

    const checkoutButtons = screen.getAllByRole("button", {
      name: "Check-Out",
    })
    expect(checkoutButtons.length).toBeGreaterThan(0)
    fireEvent.click(checkoutButtons[0])

    // Switch to Tab 3: Kapal & Manifest Kru
    const vesselTab = screen.getByRole("tab", {
      name: /3\. Kapal & Manifest Kru/i,
    })
    fireEvent.click(vesselTab)

    // Open Crew Management Modal
    const openModalBtn = screen.getAllByRole("button", {
      name: /Buka Modal Kelola Kru/i,
    })[0]
    fireEvent.click(openModalBtn)

    // Link unlinked crew (WAYAN SUDARMA) to vessel first, then Check-In
    const linkCrewBtn = screen.getByRole("button", {
      name: /Gabungkan ke Kapal/i,
    })
    fireEvent.click(linkCrewBtn)

    const crewCheckInBtns = screen.getAllByRole("button", {
      name: "Check-In Kru",
    })
    fireEvent.click(crewCheckInBtns[0])
    expect(screen.getAllByText("On-Board").length).toBeGreaterThanOrEqual(2)
  })
})