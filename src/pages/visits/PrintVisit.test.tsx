import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PrintVisit from './PrintVisit'
import api from '@/lib/axios'
import { resetAppConfigCache } from '@/lib/appConfig'

vi.mock('@/lib/axios')

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Petugas Jaga Gerbang' },
  }),
}))

const sampleVisit = {
  id: 301,
  ticket_number: '26/09/00301',
  visitor: {
    name: 'Ir. Hendra Gunawan',
    id_type: 'ktp',
    id_number: '2171010101010001',
    company: 'PT Surveyor Indonesia',
  },
  visitor_company: 'PT Surveyor Indonesia',
  location_name: 'Graving Dock 1',
  host_name: 'Bpk. Suryanto',
  purpose: 'Survey Ketebalan Plat Lambung',
  time_in: '09:15',
  date: '2026-09-24',
  vehicle_no: 'BP 9876 XY',
  visitor_cards: [{ card_no: 'VIS-99' }],
  printed_by: 'Petugas Jaga Gerbang',
}

const yardConfig = {
  company_name: 'PT. ASL Shipyard Indonesia',
  company_address: 'Tanjung Uncang, Batam',
  logo_url: null,
  yard_code: 'ASL',
}

function mockApi(appConfig: unknown) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/app-config') {
      return appConfig instanceof Error ? Promise.reject(appConfig) : Promise.resolve({ data: appConfig })
    }
    if (url === '/visits/301/print') {
      return Promise.resolve({ data: { visit: sampleVisit } })
    }
    return Promise.resolve({ data: [] })
  })
}

function renderFromState() {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/visits/301/print', state: { visit: sampleVisit } }]}>
      <Routes>
        <Route path="/visits/:id/print" element={<PrintVisit />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PrintVisit Page', () => {
  let printSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetAppConfigCache()
    printSpy = vi.fn()
    vi.stubGlobal('print', printSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders pass details directly from navigation state', async () => {
    mockApi(yardConfig)
    renderFromState()

    expect(screen.getByText(/26\/09\/00301/i)).toBeInTheDocument()
    expect(screen.getByText(/Ir. Hendra Gunawan/i)).toBeInTheDocument()
    expect(screen.getByText(/Graving Dock 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Petugas Jaga Gerbang/i)).toBeInTheDocument()
  })

  it('falls back to GET /api/visits/:id/print when state is empty', async () => {
    mockApi(yardConfig)

    render(
      <MemoryRouter initialEntries={['/visits/301/print']}>
        <Routes>
          <Route path="/visits/:id/print" element={<PrintVisit />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/visits/301/print')
      expect(screen.getByText(/26\/09\/00301/i)).toBeInTheDocument()
      expect(screen.getByText(/Ir. Hendra Gunawan/i)).toBeInTheDocument()
      expect(screen.getByText(/Graving Dock 1/i)).toBeInTheDocument()
    })
  })

  it("prints this yard's company from /app-config, never another yard's (PE-7)", async () => {
    mockApi(yardConfig)
    renderFromState()

    expect(
      await screen.findByRole('heading', { name: 'PT. ASL SHIPYARD INDONESIA' })
    ).toBeInTheDocument()
    expect(screen.getByText('Tanjung Uncang, Batam')).toBeInTheDocument()
    expect(
      screen.getByText('PT. ASL Shipyard Indonesia is not liable for injury or property loss.')
    ).toBeInTheDocument()
    expect(screen.queryByText(/cemara/i)).not.toBeInTheDocument()
  })

  it('falls back to a neutral name when the yard has none or the config cannot load', async () => {
    mockApi(new Error('offline'))
    renderFromState()

    expect(
      await screen.findByRole('heading', { name: 'VISITOR MANAGEMENT SYSTEM' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('The company is not liable for injury or property loss.')
    ).toBeInTheDocument()
  })

  it('opens the print dialog only after the company name is known', async () => {
    let answer: (value: unknown) => void = () => {}
    vi.mocked(api.get).mockImplementation((url: string) =>
      url === '/app-config'
        ? new Promise((resolve) => {
            answer = resolve
          })
        : Promise.resolve({ data: [] })
    )
    renderFromState()

    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(printSpy).not.toHaveBeenCalled()

    answer({ data: yardConfig })
    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1), { timeout: 2000 })
  })
})
