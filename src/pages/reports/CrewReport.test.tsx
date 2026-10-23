import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import CrewReport from './CrewReport'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Supervisor User', roles: ['supervisor'] },
    hasPermission: (perm: string) =>
      ['view_reports', 'export_visits'].includes(perm),
    hasRole: (role: string) => role === 'supervisor',
  }),
}))

const sampleCrewResponse = {
  data: [
    {
      id: 'placement-1',
      vessel_arrival_id: 'va-1',
      visitor_id: 'vis-1',
      status: 'checked_in',
      checked_in_at: '2026-10-01T08:00:00.000Z',
      checked_out_at: null,
      notes: 'Active chief engineer',
      visitor: {
        id: 'vis-1',
        visitor_no: 300001,
        name: 'Ahmad Pelaut',
        id_type: 'passport',
        id_number: 'P99887766',
        gender: 'male',
        nationality: 'Indonesia',
        company: 'PT Pelayaran Nasional',
        occupation: 'Chief Engineer',
        seaman_book_no: 'SB-112233',
        certificate: 'COC Class 1',
        certificate_no: 'COC-001',
      },
      vessel_arrival: {
        id: 'va-1',
        vessel_name: 'MV. OCEAN VOYAGER',
        sign_in_date: '2026-10-01',
        sign_in_port: 'Batam',
        sign_out_date: null,
        sign_out_port: null,
        captain: 'Capt. Hendra',
        local_agent_company: 'PT Batam Agent',
        foreign_agent_company: 'Global Maritime',
        vessel: {
          id: 'vess-1',
          code: 'IMO-9123456',
          name: 'MV. OCEAN VOYAGER',
          call_sign: 'PK998',
          flag: 'Indonesia',
        },
      },
    },
  ],
  current_page: 1,
  last_page: 1,
  total: 1,
}

describe('CrewReport Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    window.URL.revokeObjectURL = vi.fn()

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/reports/crew') {
        return { data: sampleCrewResponse }
      }
      if (url === '/reports/crew/export') {
        return { data: new Blob(['fake-crew-excel']) }
      }
      if (url === '/reports/crew/pdf') {
        return { data: new Blob(['fake-crew-pdf'], { type: 'application/pdf' }) }
      }
      return { data: {} }
    })
  })

  it('renders crew report page with records from API', async () => {
    render(
      <MemoryRouter>
        <CrewReport />
      </MemoryRouter>
    )

    expect(screen.getByText(/Laporan & Ekspor Kru Kapal|Crew Report & Export/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
      expect(screen.getByText('MV. OCEAN VOYAGER')).toBeInTheDocument()
      expect(screen.getByText('Chief Engineer')).toBeInTheDocument()
      expect(screen.getByText(/P99887766/)).toBeInTheDocument()
    })
  })

  it('triggers Excel export blob download for crew report', async () => {
    render(
      <MemoryRouter>
        <CrewReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
    })

    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel|Export Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/reports/crew/export',
        expect.objectContaining({
          responseType: 'blob',
        })
      )
    })
  })

  it('triggers PDF export blob download for crew report', async () => {
    render(
      <MemoryRouter>
        <CrewReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
    })

    const exportPdfBtn = screen.getByRole('button', { name: /Cetak \/ PDF|Export PDF/i })
    fireEvent.click(exportPdfBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/reports/crew/pdf',
        expect.objectContaining({
          responseType: 'blob',
        })
      )
    })
  })
})
