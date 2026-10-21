import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ActiveVisits from './ActiveVisits'
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
    user: { id: 1, name: 'Security User', roles: ['security'] },
    hasPermission: (perm: string) =>
      ['view_visits', 'checkout_visits'].includes(perm),
    hasRole: (role: string) => role === 'security',
  }),
}))

const sampleVisits = [
  {
    id: 101,
    ticket_number: '26/09/00001',
    visitor_cards: [{ card_no: 'VIS-001' }],
    visitor: { name: 'Ahmad Dahlan', company: 'PT Bahari' },
    location_name: 'Dermaga Barat',
    host_name: 'Pak Budi',
    purpose: 'Inspeksi Kapal',
    time_in: '08:30',
    days_open: 0,
    check_in_at: '2026-09-24 08:30:00',
  },
  {
    id: 102,
    ticket_number: '26/09/00002',
    visitor_cards: [{ card_no: 'VIS-002' }],
    visitor: { name: 'Siti Aminah', company: 'CV Mandiri' },
    location_name: 'Bengkel Bubut',
    host_name: 'Ibu Rina',
    purpose: 'Pengiriman Komponen',
    time_in: '2026-09-22 14:00',
    days_open: 2,
    check_in_at: '2026-09-22 14:00:00',
  },
]

describe('ActiveVisits Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: sampleVisits })
  })

  it('renders active visits with Ticket, Visitor, Location, Host, and Days Open badge', async () => {
    render(
      <MemoryRouter>
        <ActiveVisits />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('26/09/00001')).toBeInTheDocument()
      expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument()
      expect(screen.getByText('Dermaga Barat')).toBeInTheDocument()
      expect(screen.getByText('Pak Budi')).toBeInTheDocument()
      expect(screen.getByText('26/09/00002')).toBeInTheDocument()
      expect(screen.getByText('Bengkel Bubut')).toBeInTheDocument()
      // Overdue visitor (days_open > 0)
      expect(screen.getByText(/2d|2 hari/i)).toBeInTheDocument()
    })
  })

  it('filters active visits by visitor name or card number', async () => {
    render(
      <MemoryRouter>
        <ActiveVisits />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'Siti' } })

    expect(screen.queryByText('Ahmad Dahlan')).not.toBeInTheDocument()
    expect(screen.getByText('Siti Aminah')).toBeInTheDocument()
  })

  it('confirms and executes check out', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { message: 'Checked out successfully' },
    })

    render(
      <MemoryRouter>
        <ActiveVisits />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument()
    })

    const checkoutButtons = screen.getAllByRole('button', {
      name: /check out/i,
    })
    fireEvent.click(checkoutButtons[0])

    // Alert dialog opens
    expect(
      screen.getByText(/are you absolutely sure|confirm visitor check-out|konfirmasi check-out/i)
    ).toBeInTheDocument()

    const confirmActionBtn = screen.getByRole('button', {
      name: /confirm check out|ya, check out/i,
    })
    fireEvent.click(confirmActionBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/visits/101/checkout')
    })
  })

  it('displays Crew Kapal badge and vessel metadata (IMO, Tipe, Captain, PIC) when visiting a vessel', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 105,
          ticket_number: '26/10/00005',
          visitor_cards: [{ card_no: 'VIS-009' }],
          visitor: {
            name: 'Hendra Wijaya',
            company: 'PT Pelayaran Nusantara',
            visitor_type: 'crew',
            occupation: 'Chief Officer',
          },
          location_name: 'GAS WIDURI',
          location: {
            id: 'v-1',
            name: 'GAS WIDURI',
            code: '9764790',
            type: 'repair_vessel',
            vessel_type: 'LPG TANKER',
            captain: 'CAPT. SUTRISNO',
            pic: 'ALVI',
          },
          host_name: 'CAPT. SUTRISNO',
          purpose: 'Dinas / Penugasan Kru Kapal',
          time_in: '09:15',
          days_open: 0,
        },
      ],
    })

    render(
      <MemoryRouter>
        <ActiveVisits />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Hendra Wijaya')).toBeInTheDocument()
      expect(screen.getByText(/Crew Kapal • Chief Officer/i)).toBeInTheDocument()
      expect(screen.getByText('GAS WIDURI')).toBeInTheDocument()
      expect(screen.getByText('LPG TANKER')).toBeInTheDocument()
      expect(screen.getByText(/IMO: 9764790/i)).toBeInTheDocument()
      expect(screen.getByText(/Capt: CAPT\. SUTRISNO/i)).toBeInTheDocument()
      expect(screen.getByText(/PIC: ALVI/i)).toBeInTheDocument()
    })
  })
})
