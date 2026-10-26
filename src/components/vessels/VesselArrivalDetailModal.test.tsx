import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VesselArrivalDetailModal from './VesselArrivalDetailModal'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockDetail = {
  id: 'uuid-arrival-1',
  location_id: 'uuid-vessel-1',
  vessel_name: 'MV. PACIFIC GLORY',
  sign_in_date: '2026-09-20',
  sign_out_date: null,
  sign_in_port: 'BATAM',
  sign_out_port: null,
  captain: 'Capt. Robert',
  local_agent_company: 'PT. Batam Marine',
  local_agent_name: 'John Doe',
  local_agent_phone: '08123456789',
  local_agent_location: 'Batam Centre',
  foreign_agent_company: 'Global Maritime Ltd',
  foreign_agent_name: 'Mr. Smith',
  foreign_agent_phone: '+6512345678',
  foreign_agent_location: 'Jurong Port',
  vessel: {
    id: 'uuid-vessel-1',
    name: 'MV. PACIFIC GLORY',
    code: 'IMO9123456',
    type: 'repair_vessel',
    call_sign: 'YBDT',
    flag: 'INDONESIA',
    port: 'BATAM',
  },
  crew: [
    {
      id: 'crew-1',
      visitor_no: '1000101',
      name: 'Budi Santoso',
      id_type: 'ktp',
      id_number: '1234567890',
      gender: 'M',
      occupation: 'Chief Engineer',
      nationality: 'INDONESIA',
      certificate: 'ANT III',
      certificate_no: 'CERT-9988',
      seaman_book_no: 'SB-12345',
      pivot: {
        status: 'checked_in',
        checked_in_at: '2026-09-20T08:00:00Z',
        checked_out_at: null,
      },
    },
    {
      id: 'crew-2',
      visitor_no: '1000102',
      name: 'Ahmad Pelaut',
      id_type: 'ktp',
      id_number: '9876543210',
      gender: 'M',
      occupation: 'Bosun',
      nationality: 'INDONESIA',
      certificate: null,
      certificate_no: null,
      seaman_book_no: 'SB-54321',
      pivot: {
        status: 'checked_out',
        checked_in_at: '2026-09-20T08:00:00Z',
        checked_out_at: '2026-09-21T17:00:00Z',
      },
    },
  ],
}

describe('VesselArrivalDetailModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      data: mockDetail,
    })
  })

  it('renders vessel arrival details and schedule', async () => {
    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /detail kedatangan kapal/i })).toBeInTheDocument()
      expect(screen.getByText('MV. PACIFIC GLORY')).toBeInTheDocument()
      expect(screen.getByText('IMO9123456')).toBeInTheDocument()
      expect(screen.getByText('Capt. Robert')).toBeInTheDocument()
      expect(screen.getByText(/Dari: BATAM/i)).toBeInTheDocument()
      expect(screen.getByText('PT. Batam Marine')).toBeInTheDocument()
    })
  })

  it('displays the list of crew members attached to the arrival', async () => {
    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
      expect(screen.getByText('Chief Engineer')).toBeInTheDocument()
      expect(screen.getByText(/SB-12345/)).toBeInTheDocument()
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
      expect(screen.getByText('Bosun')).toBeInTheDocument()
      expect(screen.getByText(/SB-54321/)).toBeInTheDocument()
    })
  })

  it('displays in port status when sign_out_date is null', async () => {
    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Sedang Sandar/i).length).toBeGreaterThan(0)
    })
  })

  it('triggers POST /vessel-arrivals/:id/crew/check-out when Check-Out Kru is clicked', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        ...mockDetail,
        crew: mockDetail.crew.map((c) => ({
          ...c,
          pivot: { ...c.pivot, status: 'checked_out', checked_out_at: '2026-09-22T10:00:00Z' },
        })),
      },
    })

    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    const checkOutBtns = screen.getAllByRole('button', { name: /^check-out kru$/i })
    const checkOutBtn = checkOutBtns.find((b) => !b.hasAttribute('disabled'))!
    fireEvent.click(checkOutBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/vessel-arrivals/uuid-arrival-1/crew/check-out', {
        crew_ids: ['crew-1'],
      })
    })
  })

  it('switches to Riwayat Log Keluar-Masuk Kru tab and filters logs per crew member', async () => {
    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    // Click Riwayat Log Keluar-Masuk Kru tab
    fireEvent.click(screen.getByRole('button', { name: /riwayat log keluar-masuk kru/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/filter kru/i)).toBeInTheDocument()
      expect(screen.getAllByText(/^Check-In$/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/^Check-Out$/i).length).toBeGreaterThan(0)
    })

    // Filter specifically for Budi Santoso (crew-1)
    fireEvent.change(screen.getByLabelText(/filter kru/i), {
      target: { value: 'crew-1' },
    })

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
      expect(screen.queryByText('Ahmad Pelaut')).not.toBeInTheDocument()
    })
  })

  it('filters crew manifest by Kru Terdaftar / Aktif and History Kru Selesai sub-tabs', async () => {
    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
    })

    // Click "Kru Terdaftar / Aktif" sub-tab button
    const activeBtn = screen.getByRole('button', { name: /kru terdaftar \/ aktif/i })
    fireEvent.click(activeBtn)

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
      expect(screen.queryByText('Ahmad Pelaut')).not.toBeInTheDocument()
    })

    // Click "History Kru Selesai" sub-tab button
    const historyBtn = screen.getByRole('button', { name: /history kru selesai/i })
    fireEvent.click(historyBtn)

    await waitFor(() => {
      expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument()
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
    })
  })

  it('allows checking in a checked-out crew member via Check-In Kru button', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        ...mockDetail,
        crew: mockDetail.crew.map((c) =>
          c.id === 'crew-2' ? { ...c, pivot: { ...c.pivot, status: 'checked_in' } } : c
        ),
      },
    })

    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
    })

    // Click "History Kru Selesai" to find Ahmad Pelaut (who is checked_out)
    const historyBtn = screen.getByRole('button', { name: /history kru selesai/i })
    fireEvent.click(historyBtn)

    await waitFor(() => {
      expect(screen.getByText('Ahmad Pelaut')).toBeInTheDocument()
    })

    // The Check-In button for Ahmad Pelaut should be enabled and clickable
    const checkInBtn = screen.getByRole('button', { name: /check-in kru/i })
    expect(checkInBtn).not.toBeDisabled()
    fireEvent.click(checkInBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/vessel-arrivals/uuid-arrival-1/crew/check-in',
        expect.objectContaining({ crew_ids: ['crew-2'] })
      )
    })
  })

  it('triggers export of crew logs to Excel when export button is clicked', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/crew-logs/export')) {
        return Promise.resolve({ data: new Blob(['fake-excel-data']) })
      }
      return Promise.resolve({ data: mockDetail })
    })

    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    // Switch to Riwayat Log tab
    fireEvent.click(screen.getByRole('button', { name: /riwayat log keluar-masuk kru/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ekspor log/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /ekspor log/i }))

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/vessel-arrivals/uuid-arrival-1/crew-logs/export',
        expect.objectContaining({ responseType: 'blob' })
      )
    })
  })

  it('synthesizes historical crew from logs who were removed/detached from manifest', async () => {
    const detailWithDetachedCrew = {
      ...mockDetail,
      crew: [mockDetail.crew[0]], // only Budi Santoso in manifest
      crew_logs: [
        {
          id: 'log-detached-1',
          vessel_arrival_id: 'uuid-arrival-1',
          visitor_id: 'crew-detached-99',
          action: 'check_out',
          source: 'vessel_signon',
          performed_by_name: 'Admin',
          notes: 'Dilepas dari manifest kedatangan kapal',
          logged_at: '2026-09-22 14:00:00',
          visitor: {
            id: 'crew-detached-99',
            visitor_no: 99999,
            name: 'Kru Yang Dilepas',
            id_type: 'ktp',
            id_number: '217109999999',
            occupation: 'Oiler',
            nationality: 'Indonesia',
          },
        },
      ],
    }

    vi.mocked(api.get).mockResolvedValueOnce({ data: detailWithDetachedCrew })

    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    // Switch to History Kru Selesai
    const historyBtn = screen.getByRole('button', { name: /history kru selesai/i })
    fireEvent.click(historyBtn)

    await waitFor(() => {
      expect(screen.getByText('Kru Yang Dilepas')).toBeInTheDocument()
      expect(screen.getByText(/dilepas dari manifest kedatangan kapal/i)).toBeInTheDocument()
    })
  })

  it('opens confirmation and calls detach endpoint when Lepas Kru is confirmed', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        ...mockDetail,
        crew: mockDetail.crew.filter((c) => c.id !== 'crew-1'),
      },
    })

    render(
      <VesselArrivalDetailModal
        open={true}
        onClose={mockOnClose}
        arrivalId="uuid-arrival-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    const detachBtns = screen.getAllByRole('button', { name: /lepas kru/i })
    expect(detachBtns.length).toBeGreaterThan(0)
    fireEvent.click(detachBtns[0])

    await waitFor(() => {
      expect(screen.getByText(/lepas kru dari penugasan kapal/i)).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole('button', { name: /lepas dari kapal/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/vessel-arrivals/uuid-arrival-1/crew/detach',
        expect.objectContaining({ visitor_id: 'crew-1' })
      )
    })
  })
})

