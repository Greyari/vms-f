import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Locations from './Locations'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const sampleLocations = [
  {
    id: 'uuid-loc-1',
    name: 'Slipway 1',
    type: 'location',
    code: 'SLIPWAY_1',
    call_sign: null,
    flag: null,
    is_active: true,
  },
  {
    id: 'uuid-vessel-2',
    name: 'MV Samudera Raya',
    type: 'repair_vessel',
    code: 'IMO9123456',
    call_sign: 'YBDT',
    flag: 'Indonesia',
    is_active: true,
  },
]

describe('Locations Master Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: sampleLocations,
        current_page: 1,
        last_page: 1,
        total: 2,
      },
    })
  })

  it('renders locations and vessels list with codes and badges', async () => {
    render(<Locations />)

    await waitFor(() => {
      expect(screen.getByText('Slipway 1')).toBeInTheDocument()
      expect(screen.getByText('MV Samudera Raya')).toBeInTheDocument()
      expect(screen.getByText('IMO9123456')).toBeInTheDocument()
    })
  })

  it('filters locations by type when type dropdown changes', async () => {
    render(<Locations />)

    await waitFor(() => {
      expect(screen.getByText('Slipway 1')).toBeInTheDocument()
    })

    const typeFilter = screen.getByLabelText(/filter tipe/i)
    fireEvent.change(typeFilter, { target: { value: 'repair_vessel' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/locations', expect.objectContaining({
        params: expect.objectContaining({ type: 'repair_vessel' }),
      }))
    })
  })

  it('submits a new vessel with code and triggers POST /locations', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 'uuid-vessel-3',
        name: 'TB Intan 01',
        type: 'tug_boat',
        code: 'IMO8899001',
        is_active: true,
      },
    })

    render(<Locations />)

    await waitFor(() => {
      expect(screen.getByText('Slipway 1')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /tambah lokasi|tambah/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tambah lokasi atau kapal/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/nama lokasi \/ kapal/i), {
      target: { value: 'TB Intan 01' },
    })

    fireEvent.change(screen.getByLabelText(/tipe lokasi/i), {
      target: { value: 'tug_boat' },
    })

    fireEvent.change(screen.getByLabelText(/kode \/ imo/i), {
      target: { value: 'IMO8899001' },
    })

    const saveButton = screen.getByRole('button', { name: /simpan/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/locations', expect.objectContaining({
        name: 'TB Intan 01',
        type: 'tug_boat',
        code: 'IMO8899001',
      }))
    })
  })

  it('triggers DELETE /locations/{id} on confirmation', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { message: 'Location deleted successfully' } })

    render(<Locations />)

    await waitFor(() => {
      expect(screen.getByText('Slipway 1')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /hapus/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /konfirmasi hapus/i })).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /ya, hapus/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/locations/uuid-loc-1')
    })
  })

  it('displays and submits vessel_type, captain, and pic (Note) fields matching Excel structure', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'uuid-vessel-excel',
            name: 'GAS WIDURI',
            type: 'repair_vessel',
            vessel_type: 'LPG TANKER',
            code: '9764790',
            call_sign: 'POJR',
            flag: 'INDONESIA',
            captain: 'CAPT. SUTRISNO',
            pic: 'ALVI',
            is_active: true,
          },
        ],
        current_page: 1,
        last_page: 1,
        total: 1,
      },
    })

    render(<Locations />)

    await waitFor(() => {
      expect(screen.getByText('GAS WIDURI')).toBeInTheDocument()
      expect(screen.getByText('LPG TANKER')).toBeInTheDocument()
      expect(screen.getByText('CAPT. SUTRISNO')).toBeInTheDocument()
      expect(screen.getByText('ALVI')).toBeInTheDocument()
    })
  })
})
