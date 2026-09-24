import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SignOutVesselModal from './SignOutVesselModal'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockArrival = {
  id: 'uuid-arrival-1',
  location_id: 'uuid-vessel-1',
  vessel_name: 'MV. PACIFIC GLORY',
  sign_in_date: '2026-09-20',
  sign_out_date: null,
  sign_in_port: 'BATAM',
  sign_out_port: null,
  captain: 'Capt. Robert',
}

describe('SignOutVesselModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with vessel info and defaults sign_out_date', async () => {
    render(
      <SignOutVesselModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        arrival={mockArrival}
      />
    )

    expect(screen.getByRole('heading', { name: /sign-out keberangkatan kapal/i })).toBeInTheDocument()
    expect(screen.getByText('MV. PACIFIC GLORY')).toBeInTheDocument()
    expect(screen.getByText('2026-09-20')).toBeInTheDocument()
    expect(screen.getByLabelText(/tanggal keberangkatan/i)).toBeInTheDocument()
  })

  it('shows error if sign_out_date is cleared and submitted', async () => {
    render(
      <SignOutVesselModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        arrival={mockArrival}
      />
    )

    const dateInput = screen.getByLabelText(/tanggal keberangkatan/i)
    fireEvent.change(dateInput, { target: { value: '' } })

    const submitBtn = screen.getByRole('button', { name: /konfirmasi keberangkatan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/tanggal keberangkatan wajib diisi/i)).toBeInTheDocument()
    })
    expect(api.put).not.toHaveBeenCalled()
  })

  it('rejects sign_out_date earlier than sign_in_date', async () => {
    render(
      <SignOutVesselModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        arrival={mockArrival}
      />
    )

    const dateInput = screen.getByLabelText(/tanggal keberangkatan/i)
    fireEvent.change(dateInput, { target: { value: '2026-09-15' } }) // Earlier than 2026-09-20

    const submitBtn = screen.getByRole('button', { name: /konfirmasi keberangkatan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/tanggal keberangkatan tidak boleh mendahului tanggal kedatangan/i)).toBeInTheDocument()
    })
    expect(api.put).not.toHaveBeenCalled()
  })

  it('submits successfully to PUT /vessel-arrivals/:id with date and port', async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: { id: 'uuid-arrival-1', sign_out_date: '2026-09-25' },
    })

    render(
      <SignOutVesselModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        arrival={mockArrival}
      />
    )

    const dateInput = screen.getByLabelText(/tanggal keberangkatan/i)
    fireEvent.change(dateInput, { target: { value: '2026-09-25' } })

    const portInput = screen.getByLabelText(/pelabuhan tujuan/i)
    fireEvent.change(portInput, { target: { value: 'SINGAPORE' } })

    const submitBtn = screen.getByRole('button', { name: /konfirmasi keberangkatan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/vessel-arrivals/uuid-arrival-1',
        expect.objectContaining({
          sign_out_date: '2026-09-25',
          sign_out_port: 'SINGAPORE',
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
