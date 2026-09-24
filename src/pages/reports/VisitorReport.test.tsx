import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import VisitorReport from './VisitorReport'
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

const sampleVisitsResponse = {
  data: [
    {
      id: 'vis-1',
      ticket_number: '26/09/00001',
      legacy_registration_no: null,
      date: '2026-09-24',
      time_in: '08:30',
      time_out: null,
      checked_out_at: null,
      purpose: 'Inspeksi Kapal',
      vehicle_no: 'B 1234 ABC',
      visitor_name: 'Budi Santoso',
      visitor_company: 'PT Samudera',
      host_name: 'Pak Mandor',
      location_name: 'Dermaga 1',
      days_open: 0,
      visitor: {
        id: 'v-1',
        visitor_no: 100001,
        name: 'Budi Santoso',
        id_type: 'ktp',
        id_number: '1234567890123456',
        company: 'PT Samudera',
        visitor_type: 'contractor',
      },
      visitor_cards: [{ id: 'c-1', card_no: 'VIS-101' }],
      vehicle_card: { id: 'vc-1', card_no: 'VEH-01' },
    },
    {
      id: 'vis-2',
      ticket_number: '26/09/00002',
      legacy_registration_no: 'REG-999',
      date: '2026-09-23',
      time_in: '09:00',
      time_out: '17:00',
      checked_out_at: '2026-09-23 17:00:00',
      purpose: 'Pengantaran Sparepart',
      vehicle_no: null,
      visitor_name: 'Siti Rahma',
      visitor_company: 'CV Bahari',
      host_name: 'Ibu Rina',
      location_name: 'Bengkel Mesin',
      days_open: 0,
      visitor: {
        id: 'v-2',
        visitor_no: 100002,
        name: 'Siti Rahma',
        id_type: 'sim',
        id_number: '987654321',
        company: 'CV Bahari',
        visitor_type: 'regular',
      },
      visitor_cards: [{ id: 'c-2', card_no: 'VIS-102' }],
      vehicle_card: null,
    },
  ],
  current_page: 1,
  last_page: 2,
  total: 2,
}

describe('VisitorReport Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    window.URL.revokeObjectURL = vi.fn()

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/reports/visits') {
        return { data: sampleVisitsResponse }
      }
      if (url === '/reports/visits/export') {
        return { data: new Blob(['fake-excel-data']) }
      }
      if (url === '/reports/visits/pdf') {
        return { data: new Blob(['fake-pdf-data']) }
      }
      return { data: {} }
    })
  })

  it('renders visitor report table with data from API', async () => {
    render(
      <MemoryRouter>
        <VisitorReport />
      </MemoryRouter>
    )

    expect(screen.getByText(/Laporan Kunjungan/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('26/09/00001')).toBeInTheDocument()
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
      expect(screen.getByText('PT Samudera')).toBeInTheDocument()
      expect(screen.getByText('Dermaga 1')).toBeInTheDocument()
      expect(screen.getByText('OPEN')).toBeInTheDocument()

      expect(screen.getByText('26/09/00002')).toBeInTheDocument()
      expect(screen.getByText('Siti Rahma')).toBeInTheDocument()
      expect(screen.getByText('17:00')).toBeInTheDocument()
    })
  })

  it('submits filter parameters to GET /api/reports/visits', async () => {
    render(
      <MemoryRouter>
        <VisitorReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/reports/visits',
        expect.any(Object)
      )
    })

    const nameInput = screen.getByPlaceholderText(/Nama pengunjung/i)
    fireEvent.change(nameInput, { target: { value: 'Budi' } })

    const companyInput = screen.getByPlaceholderText(/Nama perusahaan/i)
    fireEvent.change(companyInput, { target: { value: 'PT Samudera' } })

    const searchButton = screen.getByRole('button', { name: /Terapkan Filter/i })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/reports/visits',
        expect.objectContaining({
          params: expect.objectContaining({
            visitor_name: 'Budi',
            company: 'PT Samudera',
            page: 1,
          }),
        })
      )
    })
  })

  it('handles open_only toggle filter correctly', async () => {
    render(
      <MemoryRouter>
        <VisitorReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('26/09/00001')).toBeInTheDocument()
    })

    const openOnlyCheckbox = screen.getByLabelText(/Hanya Kunjungan Aktif/i)
    fireEvent.click(openOnlyCheckbox)

    const searchButton = screen.getByRole('button', { name: /Terapkan Filter/i })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/reports/visits',
        expect.objectContaining({
          params: expect.objectContaining({
            open_only: true,
          }),
        })
      )
    })
  })

  it('triggers Excel export blob download', async () => {
    render(
      <MemoryRouter>
        <VisitorReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('26/09/00001')).toBeInTheDocument()
    })

    const exportBtn = screen.getByRole('button', { name: /Export Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/reports/visits/export',
        expect.objectContaining({
          responseType: 'blob',
        })
      )
    })
  })

  it('displays 5000 rows limit alert dialog when PDF export returns HTTP 422', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/reports/visits') {
        return { data: sampleVisitsResponse }
      }
      if (url === '/reports/visits/pdf') {
        const error: any = new Error('Limit exceeded')
        error.response = {
          status: 422,
          data: new Blob([
            JSON.stringify({
              message:
                'Print and PDF export limit of 5,000 rows exceeded. Please narrow your date range or filters.',
            }),
          ]),
        }
        throw error
      }
      return { data: {} }
    })

    render(
      <MemoryRouter>
        <VisitorReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('26/09/00001')).toBeInTheDocument()
    })

    const printBtn = screen.getByRole('button', { name: /Cetak \/ PDF/i })
    fireEvent.click(printBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Batas Cetak Terlampaui/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/5\.000 baris/i)
      ).toBeInTheDocument()
    })

    const dismissBtn = screen.getByRole('button', { name: /Mengerti/i })
    fireEvent.click(dismissBtn)

    await waitFor(() => {
      expect(
        screen.queryByText(/Batas Cetak Terlampaui/i)
      ).not.toBeInTheDocument()
    })
  })
})
