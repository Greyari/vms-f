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

    const checkOutBtn = screen.getByRole('button', { name: /^check-out kru$/i })
    fireEvent.click(checkOutBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/vessel-arrivals/uuid-arrival-1/crew/check-out', {
        crew_ids: ['crew-1'],
      })
    })
  })
})
