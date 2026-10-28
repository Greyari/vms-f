import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CrewPersonPanelModal from './CrewPersonPanelModal'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockPersonDetail = {
  visitor: {
    id: 'crew-1',
    name: 'Captain Haddock',
    visitor_no: 'VIS-2026-0999',
    id_type: 'passport',
    id_number: 'P12345678',
    company: 'Marlinspike Shipping',
    occupation: 'Master',
    is_blacklisted: false,
  },
  current_placement: {
    vessel_arrival_id: 'arr-1',
    vessel_name: 'KARABOUDJAN',
    status: 'expected',
    sign_in_date: '2026-10-20',
    sign_out_date: null,
  },
  logs: [],
}

describe('CrewPersonPanelModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders check-in button when vessel is actively in port', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: mockPersonDetail,
    })

    render(
      <CrewPersonPanelModal
        open={true}
        onClose={vi.fn()}
        visitorId="crew-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Captain Haddock')).toBeInTheDocument()
      expect(screen.getByText('KARABOUDJAN')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /check-in kru/i })).toBeInTheDocument()
      expect(screen.queryByText(/kapal telah berangkat/i)).not.toBeInTheDocument()
    })
  })

  it('displays departed alert banner and disables check-in when vessel has signed out', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        ...mockPersonDetail,
        current_placement: {
          ...mockPersonDetail.current_placement,
          sign_out_date: '2026-10-26',
        },
      },
    })

    render(
      <CrewPersonPanelModal
        open={true}
        onClose={vi.fn()}
        visitorId="crew-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kapal Telah Berangkat (Sign-Out)')).toBeInTheDocument()
      expect(screen.getByText(/check-in kru dinonaktifkan karena kapal telah berangkat/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /check-in kru/i })).not.toBeInTheDocument()
    })
  })

  it('opens confirmation dialog on first Enter, and executes check-in on second Enter', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: mockPersonDetail,
    })
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true },
    })

    const onActionComplete = vi.fn()

    render(
      <CrewPersonPanelModal
        open={true}
        onClose={vi.fn()}
        visitorId="crew-1"
        onActionComplete={onActionComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Captain Haddock')).toBeInTheDocument()
    })

    // First Enter: opens confirmation dialog
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await waitFor(() => {
      expect(screen.getByText('Konfirmasi Check-In Kru')).toBeInTheDocument()
    })

    // Second Enter: executes handleCheckIn
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/vessel-arrivals/arr-1/crew/check-in',
        expect.objectContaining({
          visitor_id: 'crew-1',
        })
      )
      expect(onActionComplete).toHaveBeenCalled()
    })
  })

  it('opens check-out confirmation dialog on Enter for checked-in crew, and checks out on second Enter', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        ...mockPersonDetail,
        current_placement: {
          ...mockPersonDetail.current_placement,
          status: 'checked_in',
          checked_in_at: '2026-10-20 08:00:00',
        },
      },
    })
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true },
    })

    const onActionComplete = vi.fn()

    render(
      <CrewPersonPanelModal
        open={true}
        onClose={vi.fn()}
        visitorId="crew-1"
        onActionComplete={onActionComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Captain Haddock')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /check-out kru/i })).toBeInTheDocument()
    })

    // First Enter: opens check-out confirmation dialog
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await waitFor(() => {
      expect(screen.getByText('Konfirmasi Check-Out Kru')).toBeInTheDocument()
    })

    // Second Enter: executes handleCheckOut
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/vessel-arrivals/arr-1/crew/check-out',
        expect.objectContaining({
          visitor_id: 'crew-1',
        })
      )
      expect(onActionComplete).toHaveBeenCalled()
    })
  })
})
