import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditVisitModal from './EditVisitModal'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockOnClose = vi.fn()
const mockOnSuccess = vi.fn()

const dummyVisit = {
  id: 201,
  ticket_number: '26/09/00099',
  visitor_cards: [{ id: 50, card_no: 'V-050' }],
  visitor: { id: 10, name: 'Bambang Supriyanto', company: 'PT Samudera' },
  visitor_company: 'PT Samudera',
  location_id: 1,
  location_name: 'Dermaga Barat',
  staff_id: 10,
  host_name: 'Budi Hartono',
  purpose: 'Audit Tahunan',
  vehicle_plate: 'BP 1111 AA',
  vehicle_card_id: 60,
  checked_out_at: null,
}

describe('EditVisitModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/locations')) {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Dermaga Barat' },
            { id: 2, name: 'Dok Kolam 2' },
          ],
        })
      }
      if (url.includes('/staffs')) {
        return Promise.resolve({
          data: [
            { id: 10, name: 'Budi Hartono', department: 'QA' },
            { id: 11, name: 'Siti Rahma', department: 'HSE' },
          ],
        })
      }
      if (url.includes('/cards')) {
        return Promise.resolve({
          data: [
            { id: 50, card_no: 'V-050', status: 'in_use' },
            { id: 51, card_no: 'V-051', status: 'available' },
          ],
        })
      }
      if (url.includes('/vehicle-cards')) {
        return Promise.resolve({
          data: [{ id: 60, card_no: 'VEH-060', status: 'in_use' }],
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('renders modal with initial visit data', async () => {
    render(
      <EditVisitModal
        visit={dummyVisit}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/edit kunjungan terbuka/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue('Audit Tahunan')).toBeInTheDocument()
      expect(screen.getByDisplayValue('PT Samudera')).toBeInTheDocument()
    })
  })

  it('submits updated values via PUT /api/visits/:id', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({
      data: { message: 'Visit updated successfully' },
    })

    render(
      <EditVisitModal
        visit={dummyVisit}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Audit Tahunan')).toBeInTheDocument()
    })

    // Change purpose and company
    fireEvent.change(screen.getByLabelText(/purpose of visit|keperluan/i), {
      target: { value: 'Inspeksi Mesin Baru' },
    })
    fireEvent.change(screen.getByLabelText(/company|perusahaan/i), {
      target: { value: 'PT Samudera Logistik' },
    })

    // Submit form
    fireEvent.click(
      screen.getByRole('button', { name: /save changes|simpan perubahan/i })
    )

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/visits/201',
        expect.objectContaining({
          purpose: 'Inspeksi Mesin Baru',
          visitor_company: 'PT Samudera Logistik',
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('handles 422 error when visit is already closed and calls onClose', async () => {
    vi.mocked(api.put).mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Kunjungan ini sudah ditutup dan tidak dapat diedit.',
        },
      },
    })

    render(
      <EditVisitModal
        visit={dummyVisit}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Audit Tahunan')).toBeInTheDocument()
    })

    fireEvent.click(
      screen.getByRole('button', { name: /save changes|simpan perubahan/i })
    )

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
