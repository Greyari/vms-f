import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VesselArrivals from './VesselArrivals'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const sampleArrivals = [
  {
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
    foreign_agent_company: null,
    foreign_agent_name: null,
    foreign_agent_phone: null,
    foreign_agent_location: null,
    crew_count: 5,
    vessel: {
      id: 'uuid-vessel-1',
      name: 'MV. PACIFIC GLORY',
      code: 'IMO9123456',
      type: 'repair_vessel',
    },
  },
  {
    id: 'uuid-arrival-2',
    location_id: 'uuid-vessel-2',
    vessel_name: 'TB. SAMUDERA 01',
    sign_in_date: '2026-09-10',
    sign_out_date: '2026-09-15',
    sign_in_port: 'SINGAPORE',
    sign_out_port: 'JAKARTA',
    captain: 'Capt. Hendra',
    local_agent_company: 'PT. Pelayaran Indo',
    local_agent_name: null,
    local_agent_phone: null,
    local_agent_location: null,
    foreign_agent_company: 'Global Maritime Ltd',
    foreign_agent_name: null,
    foreign_agent_phone: null,
    foreign_agent_location: null,
    crew_count: 3,
    vessel: {
      id: 'uuid-vessel-2',
      name: 'TB. SAMUDERA 01',
      code: 'IMO9876543',
      type: 'tug_boat',
    },
  },
]

describe('VesselArrivals Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: sampleArrivals,
        current_page: 1,
        last_page: 1,
        total: 2,
      },
    })
  })

  it('renders vessel arrivals table with vessel names, IMO, status, and crew count', async () => {
    render(<VesselArrivals />)

    await waitFor(() => {
      expect(screen.getByText('MV. PACIFIC GLORY')).toBeInTheDocument()
      expect(screen.getByText('IMO9123456')).toBeInTheDocument()
      expect(screen.getByText('TB. SAMUDERA 01')).toBeInTheDocument()
      expect(screen.getByText('Capt. Robert')).toBeInTheDocument()
      expect(screen.getByText(/5 (Kru|Crew)/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Sedang Sandar|In Port/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Sudah Berangkat|Departed/i).length).toBeGreaterThan(0)
    })
  })

  it('filters arrivals by stay_status dropdown', async () => {
    render(<VesselArrivals />)

    await waitFor(() => {
      expect(screen.getByText('MV. PACIFIC GLORY')).toBeInTheDocument()
    })

    const statusSelect = screen.getByLabelText(/filter status sandar/i)
    fireEvent.change(statusSelect, { target: { value: 'not_out' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/vessel-arrivals',
        expect.objectContaining({
          params: expect.objectContaining({ stay_status: 'not_out' }),
        })
      )
    })
  })

  it('filters arrivals by vessel_name search input', async () => {
    render(<VesselArrivals />)

    await waitFor(() => {
      expect(screen.getByText('MV. PACIFIC GLORY')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/cari nama kapal|search vessel/i)
    fireEvent.change(searchInput, { target: { value: 'PACIFIC' } })

    const searchButton = screen.getByRole('button', { name: /cari|search/i })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/vessel-arrivals',
        expect.objectContaining({
          params: expect.objectContaining({ vessel_name: 'PACIFIC' }),
        })
      )
    })
  })

  it('opens delete confirmation and sends DELETE request when confirmed', async () => {
    vi.mocked(api.delete).mockResolvedValue({
      data: { message: 'Vessel arrival deleted successfully' },
    })

    render(<VesselArrivals />)

    await waitFor(() => {
      expect(screen.getByText('MV. PACIFIC GLORY')).toBeInTheDocument()
    })

    // Find and click delete button on first row
    const deleteButtons = screen.getAllByRole('button', { name: /hapus|delete/i })
    fireEvent.click(deleteButtons[0])

    // Confirmation dialog should be visible
    expect(screen.getByText(/konfirmasi hapus kedatangan kapal|confirm delete/i)).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /ya, hapus|yes, delete/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/vessel-arrivals/uuid-arrival-1')
    })
  })

  it('cancels delete dialog when Batal is clicked without calling DELETE API', async () => {
    render(<VesselArrivals />)

    await waitFor(() => {
      expect(screen.getByText('MV. PACIFIC GLORY')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /hapus|delete/i })
    fireEvent.click(deleteButtons[0])

    expect(screen.getByText(/konfirmasi hapus kedatangan kapal|confirm delete/i)).toBeInTheDocument()

    const cancelButton = screen.getByRole('button', { name: /batal|cancel/i })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText(/konfirmasi hapus kedatangan kapal|confirm delete/i)).not.toBeInTheDocument()
    })
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('handles delete failure gracefully when API returns error', async () => {
    vi.mocked(api.delete).mockRejectedValue(new Error('Internal Server Error'))

    render(<VesselArrivals />)

    await waitFor(() => {
      expect(screen.getByText('MV. PACIFIC GLORY')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /hapus|delete/i })
    fireEvent.click(deleteButtons[0])

    const confirmButton = screen.getByRole('button', { name: /ya, hapus|yes, delete/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/vessel-arrivals/uuid-arrival-1')
    })
  })
})
