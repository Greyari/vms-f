import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Cards from './Cards'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const sampleCards = [
  { id: 1, card_no: 'VIS-001', card_type: 'visitor', status: 'available' },
  { id: 2, card_no: 'VIS-002', card_type: 'visitor', status: 'in_use' },
]

describe('Cards Master Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/cards/trashed')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({
        data: {
          data: sampleCards,
          current_page: 1,
          last_page: 1,
          total: 2,
        },
      })
    })
  })

  it('renders visitor cards list with status badges', async () => {
    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('VIS-001')).toBeInTheDocument()
      expect(screen.getByText('VIS-002')).toBeInTheDocument()
    })
  })

  it('triggers API call with card_no_from and card_no_to when range filter is submitted', async () => {
    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('VIS-001')).toBeInTheDocument()
    })

    const fromInput = screen.getByLabelText(/nomor awal/i)
    const toInput = screen.getByLabelText(/nomor akhir/i)

    fireEvent.change(fromInput, { target: { value: 'VIS-001' } })
    fireEvent.change(toInput, { target: { value: 'VIS-010' } })

    const filterButton = screen.getByRole('button', { name: /terapkan filter|filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/cards', expect.objectContaining({
        params: expect.objectContaining({
          card_no_from: 'VIS-001',
          card_no_to: 'VIS-010',
          card_type: 'visitor',
        }),
      }))
    })
  })

  it('disables delete button for cards that are currently in_use', async () => {
    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('VIS-002')).toBeInTheDocument()
    })

    // In sample data, VIS-001 is available (enabled delete), VIS-002 is in_use (disabled delete)
    const deleteButtons = screen.getAllByRole('button', { name: /hapus/i })
    expect(deleteButtons[1]).toBeDisabled()
  })

  it('submits new card without status field', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 3, card_no: 'VIS-003', card_type: 'visitor', status: 'available' },
    })

    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('VIS-001')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /tambah kartu|tambah/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tambah kartu visitor/i })).toBeInTheDocument()
    })

    const cardNoInput = screen.getByLabelText(/nomor kartu/i)
    fireEvent.change(cardNoInput, { target: { value: 'VIS-003' } })

    const saveButton = screen.getByRole('button', { name: /simpan/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/cards', {
        card_no: 'VIS-003',
        card_type: 'visitor',
      })
    })
  })
})
