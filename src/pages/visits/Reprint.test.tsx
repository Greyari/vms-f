import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Reprint from './Reprint'
import api from '@/lib/axios'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/lib/axios')

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Security Officer', roles: ['security'] },
    hasPermission: () => true,
    hasRole: () => true,
  }),
}))

const sampleReprintVisits = [
  {
    id: 201,
    ticket_number: '26/09/00201',
    visitor: { name: 'Bambang Supeno', company: 'PT Maritim Perkasa' },
    visitor_company: 'PT Maritim Perkasa',
    location_name: 'Slipway 2',
    host_name: 'Ir. Joko',
    purpose: 'Inspeksi Mesin',
    time_in: '09:00',
    check_in_at: '2026-09-24 09:00:00',
    checked_out_at: null,
    visitor_cards: [{ card_no: 'VIS-010' }],
  },
  {
    id: 202,
    ticket_number: '26/09/00202',
    visitor: { name: 'Dewi Sartika', company: 'PT Bahari Lines' },
    visitor_company: 'PT Bahari Lines',
    location_name: 'Main Office Lantai 2',
    host_name: 'Ibu Ratna',
    purpose: 'Koordinasi Dokumen',
    time_in: '10:30',
    check_in_at: '2026-09-24 10:30:00',
    checked_out_at: '2026-09-24 14:00:00',
    visitor_cards: [{ card_no: 'VIS-012' }],
  },
]

describe('Reprint Visits Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: sampleReprintVisits })
  })

  it('renders reprint visit list with ticket number, visitor name, and location', async () => {
    render(
      <MemoryRouter>
        <Reprint />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('26/09/00201')).toBeInTheDocument()
      expect(screen.getByText('Bambang Supeno')).toBeInTheDocument()
      expect(screen.getByText('Slipway 2')).toBeInTheDocument()
      expect(screen.getByText('26/09/00202')).toBeInTheDocument()
      expect(screen.getByText('Dewi Sartika')).toBeInTheDocument()
      expect(screen.getByText('Main Office Lantai 2')).toBeInTheDocument()
    })
  })

  it('triggers GET /api/visits/reprint with new date parameter when date filter changes', async () => {
    render(
      <MemoryRouter>
        <Reprint />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/visits/reprint', expect.objectContaining({
        params: expect.objectContaining({ date: expect.any(String) }),
      }))
    })

    const dateInput = screen.getByLabelText(/tanggal kunjungan|visit date/i)
    fireEvent.change(dateInput, { target: { value: '2026-09-20' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/visits/reprint', expect.objectContaining({
        params: expect.objectContaining({ date: '2026-09-20' }),
      }))
    })
  })

  it('navigates to /visits/:id/print with visit state on print button click', async () => {
    render(
      <MemoryRouter>
        <Reprint />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bambang Supeno')).toBeInTheDocument()
    })

    const printButtons = screen.getAllByRole('button', { name: /print pass|print/i })
    fireEvent.click(printButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith('/visits/201/print', {
      state: { visit: sampleReprintVisits[0] },
    })
  })

  it('opens EditVisitModal when edit button is clicked for an active/open visit', async () => {
    render(
      <MemoryRouter>
        <Reprint />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Bambang Supeno')).toBeInTheDocument()
    })

    // Hanya visit 201 yang belum checkout (memiliki tombol edit), visit 202 sudah checkout
    const editButtons = screen.getAllByRole('button', { name: /edit kunjungan|edit/i })
    expect(editButtons.length).toBe(1)

    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit kunjungan terbuka/i })).toBeInTheDocument()
    })
  })

  it('displays Crew Kapal badge and vessel metadata (IMO, Tipe, Captain, PIC) in Reprint table', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 205,
          ticket_number: '26/10/00205',
          visitor: {
            name: 'Andi Saputra',
            company: 'PT Samudera',
            visitor_type: 'crew',
            occupation: 'Bosun',
          },
          visitor_company: 'PT Samudera',
          location_name: 'PACIFIC PRIDE',
          location: {
            id: 'v-2',
            name: 'PACIFIC PRIDE',
            code: '9123456',
            type: 'tug_boat',
            vessel_type: 'AHTS TUG',
            captain: 'CAPT. HENDRO',
            pic: 'DEDI',
          },
          host_name: 'CAPT. HENDRO',
          purpose: 'Dinas Kru',
          time_in: '08:00',
          checked_out_at: null,
        },
      ],
    })

    render(
      <MemoryRouter>
        <Reprint />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Andi Saputra')).toBeInTheDocument()
      expect(screen.getByText(/(crew kapal|vessel crew) • bosun/i)).toBeInTheDocument()
      expect(screen.getByText('PACIFIC PRIDE')).toBeInTheDocument()
      expect(screen.getByText('AHTS TUG')).toBeInTheDocument()
      expect(screen.getByText(/IMO: 9123456/i)).toBeInTheDocument()
      expect(screen.getByText(/Capt: CAPT\. HENDRO/i)).toBeInTheDocument()
      expect(screen.getByText(/PIC: DEDI/i)).toBeInTheDocument()
    })
  })
})
