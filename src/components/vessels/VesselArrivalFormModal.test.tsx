import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VesselArrivalFormModal from './VesselArrivalFormModal'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockLocations = [
  {
    id: 'uuid-vessel-1',
    name: 'MV. PACIFIC GLORY',
    code: 'IMO9123456',
    type: 'repair_vessel',
    is_active: true,
  },
  {
    id: 'uuid-vessel-2',
    name: 'TB. SAMUDERA 01',
    code: 'IMO9876543',
    type: 'tug_boat',
    is_active: true,
  },
  {
    id: 'uuid-place-3',
    name: 'Main Gate',
    code: 'MAIN_GATE',
    type: 'location',
    is_active: true,
  },
]

describe('VesselArrivalFormModal', () => {
  const mockOnSuccess = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/locations')) {
        return Promise.resolve({
          data: {
            data: mockLocations,
            current_page: 1,
            last_page: 1,
            total: 3,
          },
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('renders modal and populates vessel select dropdown excluding non-vessels', async () => {
    render(
      <VesselArrivalFormModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /catat kedatangan kapal baru/i })).toBeInTheDocument()
      expect(screen.getByText(/MV. PACIFIC GLORY/i)).toBeInTheDocument()
      expect(screen.getByText(/TB. SAMUDERA 01/i)).toBeInTheDocument()
      // Non-vessel ('location') should not appear in vessel selection
      expect(screen.queryByText(/Main Gate/i)).not.toBeInTheDocument()
    })
  })

  it('displays validation error if submitted without selecting a vessel', async () => {
    render(
      <VesselArrivalFormModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /catat kedatangan kapal baru/i })).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', { name: /simpan kedatangan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/kapal wajib dipilih/i)).toBeInTheDocument()
    })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('validates sign_out_date must be after or equal to sign_in_date', async () => {
    render(
      <VesselArrivalFormModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/pilih kapal/i)).toBeInTheDocument()
    })

    const vesselSelect = screen.getByLabelText(/pilih kapal/i)
    fireEvent.change(vesselSelect, { target: { value: 'uuid-vessel-1' } })

    const signInInput = screen.getByLabelText(/tanggal kedatangan/i)
    fireEvent.change(signInInput, { target: { value: '2026-09-24' } })

    const signOutInput = screen.getByLabelText(/tanggal keberangkatan/i)
    fireEvent.change(signOutInput, { target: { value: '2026-09-20' } })

    const submitBtn = screen.getByRole('button', { name: /simpan kedatangan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/tanggal keberangkatan tidak boleh mendahului tanggal kedatangan/i)).toBeInTheDocument()
    })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits form successfully and calls POST /vessel-arrivals', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'new-arrival-id' },
    })

    render(
      <VesselArrivalFormModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/pilih kapal/i)).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByLabelText(/pilih kapal/i), { target: { value: 'uuid-vessel-1' } })
    fireEvent.change(screen.getByLabelText(/tanggal kedatangan/i), { target: { value: '2026-09-24' } })
    fireEvent.change(screen.getByLabelText(/pelabuhan asal/i), { target: { value: 'BATAM' } })
    fireEvent.change(screen.getByLabelText(/nakhoda/i), { target: { value: 'Capt. Robert' } })
    fireEvent.change(screen.getByLabelText(/perusahaan agen lokal/i), { target: { value: 'PT. Batam Marine' } })

    const submitBtn = screen.getByRole('button', { name: /simpan kedatangan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/vessel-arrivals',
        expect.objectContaining({
          location_id: 'uuid-vessel-1',
          sign_in_date: '2026-09-24',
          sign_in_port: 'BATAM',
          captain: 'Capt. Robert',
          local_agent_company: 'PT. Batam Marine',
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('populates form in edit mode and submits to PUT /vessel-arrivals/:id', async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: { id: 'existing-arrival-id' },
    })

    const sampleArrival = {
      id: 'existing-arrival-id',
      location_id: 'uuid-vessel-1',
      vessel_name: 'MV. PACIFIC GLORY',
      sign_in_date: '2026-09-20',
      sign_out_date: null,
      sign_in_port: 'BATAM',
      sign_out_port: null,
      captain: 'Capt. Robert',
      local_agent_company: 'PT. Batam Marine',
      crew: [{ id: 'crew-1', name: 'Budi' }],
    }

    render(
      <VesselArrivalFormModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        arrivalToEdit={sampleArrival}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit kedatangan kapal/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue('Capt. Robert')).toBeInTheDocument()
      expect(screen.getByText(/1 Kru Terpilih/i)).toBeInTheDocument()
    })

    // Modify captain
    const captainInput = screen.getByLabelText(/nakhoda/i)
    fireEvent.change(captainInput, { target: { value: 'Capt. Alexander' } })

    const submitBtn = screen.getByRole('button', { name: /simpan kedatangan/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/vessel-arrivals/existing-arrival-id',
        expect.objectContaining({
          captain: 'Capt. Alexander',
          crew_ids: ['crew-1'],
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })
})
