import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Cards from './Cards'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const sampleCards = [
  { id: 1, card_no: 'ASL-2301', id_card_no: '0005890502', name: 'VISITOR GREEN', date_issued: '2023-07-22', card_type: 'visitor', status: 'available' },
  { id: 2, card_no: 'ASL-2302-A', id_card_no: '0002112144', name: 'VISITOR GREEN', date_issued: '2025-11-11', card_type: 'visitor', status: 'in_use' },
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

  it('renders visitor cards list with status badges and new columns', async () => {
    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('ASL-2301')).toBeInTheDocument()
      expect(screen.getByText('0005890502')).toBeInTheDocument()
      expect(screen.getByText('22.07.2023')).toBeInTheDocument()
      expect(screen.getByText('ASL-2302-A')).toBeInTheDocument()
      expect(screen.getByText('0002112144')).toBeInTheDocument()
      expect(screen.getByText('11.11.2025')).toBeInTheDocument()
    })
  })

  it('triggers API call with card_no_from and card_no_to when range filter is submitted', async () => {
    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('ASL-2301')).toBeInTheDocument()
    })

    const fromInput = screen.getByLabelText(/nomor awal/i)
    const toInput = screen.getByLabelText(/nomor akhir/i)

    fireEvent.change(fromInput, { target: { value: 'ASL-2301' } })
    fireEvent.change(toInput, { target: { value: 'ASL-2312-A' } })

    const filterButton = screen.getByRole('button', { name: /terapkan filter|filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/cards', expect.objectContaining({
        params: expect.objectContaining({
          card_no_from: 'ASL-2301',
          card_no_to: 'ASL-2312-A',
        }),
      }))
    })
  })

  it('disables delete button for cards that are currently in_use', async () => {
    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('ASL-2302-A')).toBeInTheDocument()
    })

    // In sample data, ASL-2301 is available (enabled delete), ASL-2302-A is in_use (disabled delete)
    const deleteButtons = screen.getAllByRole('button', { name: /hapus/i })
    expect(deleteButtons[1]).toBeDisabled()
  })

  it('submits new card with form fields', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 3, card_no: 'ASL-2303', id_card_no: '0011687078', name: 'VISITOR GREEN', date_issued: '2023-07-22', card_type: 'visitor', status: 'available' },
    })

    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('ASL-2301')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /tambah kartu|tambah/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tambah kartu visitor/i })).toBeInTheDocument()
    })

    const cardNoInput = screen.getByLabelText(/^card no/i)
    fireEvent.change(cardNoInput, { target: { value: 'ASL-2303' } })

    const saveButton = screen.getByRole('button', { name: /simpan/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/cards', expect.objectContaining({
        card_no: 'ASL-2303',
      }))
    })
  })

  it('submits card with lost status and note', async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: { id: 1, card_no: 'ASL-2301', status: 'lost', note: 'Hilang di dermaga 2' },
    })

    render(<Cards />)

    await waitFor(() => {
      expect(screen.getByText('ASL-2301')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit kartu visitor/i })).toBeInTheDocument()
    })

    const statusSelect = document.getElementById('cards-status-input') as HTMLSelectElement
    fireEvent.change(statusSelect, { target: { value: 'lost' } })

    const noteInput = screen.getByLabelText(/catatan \/ keterangan/i)
    fireEvent.change(noteInput, { target: { value: 'Hilang di dermaga 2' } })

    const saveButton = screen.getByRole('button', { name: /simpan/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/cards/1', expect.objectContaining({
        status: 'lost',
        note: 'Hilang di dermaga 2',
      }))
    })
  })
})
