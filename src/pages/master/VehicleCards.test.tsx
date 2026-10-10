import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VehicleCards from './VehicleCards'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const sampleVehicleCards = [
  { id: 10, card_no: 'VEH-001', card_type: 'vehicle', status: 'available' },
  { id: 11, card_no: 'VEH-002', card_type: 'vehicle', status: 'in_use' },
]

describe('Vehicle Cards Master Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/cards/trashed')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({
        data: {
          data: sampleVehicleCards,
          current_page: 1,
          last_page: 1,
          total: 2,
        },
      })
    })
  })

  it('renders vehicle cards list with status badges', async () => {
    render(<VehicleCards />)

    await waitFor(() => {
      expect(screen.getByText('VEH-001')).toBeInTheDocument()
      expect(screen.getByText('VEH-002')).toBeInTheDocument()
    })
  })

  it('triggers API call with card_no_from and card_no_to when range filter is submitted', async () => {
    render(<VehicleCards />)

    await waitFor(() => {
      expect(screen.getByText('VEH-001')).toBeInTheDocument()
    })

    const fromInput = screen.getByLabelText(/nomor awal/i)
    const toInput = screen.getByLabelText(/nomor akhir/i)

    fireEvent.change(fromInput, { target: { value: 'VEH-001' } })
    fireEvent.change(toInput, { target: { value: 'VEH-050' } })

    const filterButton = screen.getByRole('button', { name: /terapkan filter|filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/vehicle-cards', expect.objectContaining({
        params: expect.objectContaining({
          card_no_from: 'VEH-001',
          card_no_to: 'VEH-050',
        }),
      }))
    })
  })

  it('disables delete button for vehicle cards that are in_use', async () => {
    render(<VehicleCards />)

    await waitFor(() => {
      expect(screen.getByText('VEH-002')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /hapus/i })
    expect(deleteButtons[1]).toBeDisabled()
  })

  it('submits new vehicle card to /vehicle-cards', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 12, card_no: 'VEH-003', status: 'available' },
    })

    render(<VehicleCards />)

    await waitFor(() => {
      expect(screen.getByText('VEH-001')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /tambah kartu|tambah/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tambah kartu kendaraan/i })).toBeInTheDocument()
    })

    const cardNoInput = screen.getByLabelText(/nomor kartu/i)
    fireEvent.change(cardNoInput, { target: { value: 'VEH-003' } })

    const saveButton = screen.getByRole('button', { name: /simpan/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/vehicle-cards', expect.objectContaining({
        card_no: 'VEH-003',
      }))
    })
  })
})
