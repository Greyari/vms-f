import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import CreateVisit from './CreateVisit'
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

describe('CreateVisit Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/locations')) {
        return Promise.resolve({
          data: [{ id: 1, name: 'Dermaga 1', is_active: true }],
        })
      }
      if (url.includes('/staffs')) {
        return Promise.resolve({
          data: [{ id: 10, name: 'Budi Santoso', department: 'Engineering' }],
        })
      }
      if (url.includes('/cards')) {
        return Promise.resolve({
          data: [
            {
              id: 20,
              card_no: 'V-001',
              card_type: 'visitor',
              status: 'available',
            },
          ],
        })
      }
      if (url.includes('/vehicle-cards')) {
        return Promise.resolve({
          data: [
            {
              id: 30,
              card_no: 'VEH-001',
              card_type: 'vehicle',
              status: 'available',
            },
          ],
        })
      }
      if (url.includes('/lookups/purposes')) {
        return Promise.resolve({
          data: ['Meeting', 'Maintenance', 'Delivery'],
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('detects new visitor when check-ktp returns null', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/visitors/check-ktp/1234567890123456')) {
        return Promise.resolve({ data: { data: null } })
      }
      if (url.includes('/locations')) return Promise.resolve({ data: [{ id: 1, name: 'Dermaga 1' }] })
      if (url.includes('/staffs')) return Promise.resolve({ data: [{ id: 10, name: 'Budi' }] })
      if (url.includes('/cards')) return Promise.resolve({ data: [{ id: 20, card_no: 'V-001', status: 'available' }] })
      return Promise.resolve({ data: [] })
    })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    const idInput = screen.getByLabelText(/id number/i)
    fireEvent.change(idInput, { target: { value: '1234567890123456' } })

    const checkButton = screen.getByRole('button', { name: /check|search/i })
    fireEvent.click(checkButton)

    await waitFor(() => {
      expect(screen.getByText(/new visitor/i)).toBeInTheDocument()
    })
  })

  it('blocks submit and shows alert when visitor is blacklisted', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/visitors/check-ktp/9999999999999999')) {
        return Promise.resolve({
          data: {
            data: {
              id: 99,
              name: 'Blacklisted Tamu',
              is_blacklisted: true,
              blacklist_reason: 'Violation of security protocol',
              company: 'PT Rogue',
            },
          },
        })
      }
      if (url.includes('/locations')) return Promise.resolve({ data: [{ id: 1, name: 'Dermaga 1' }] })
      if (url.includes('/staffs')) return Promise.resolve({ data: [{ id: 10, name: 'Budi' }] })
      if (url.includes('/cards')) return Promise.resolve({ data: [{ id: 20, card_no: 'V-001', status: 'available' }] })
      return Promise.resolve({ data: [] })
    })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: '9999999999999999' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check|search/i }))

    await waitFor(() => {
      expect(screen.getByText(/blacklisted/i)).toBeInTheDocument()
      expect(
        screen.getByText(/violation of security protocol/i)
      ).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', { name: /save & print ticket/i })
    expect(submitBtn).toBeDisabled()
  })

  it('shows close_open_visits confirmation dialog on 422 conflict and retries', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/visitors/check-ktp/1111222233334444')) {
        return Promise.resolve({
          data: {
            data: {
              id: 5,
              name: 'Active Visitor Tamu',
              is_blacklisted: false,
              company: 'PT Maju',
            },
          },
        })
      }
      if (url.includes('/locations')) return Promise.resolve({ data: [{ id: 1, name: 'Dermaga 1' }] })
      if (url.includes('/staffs')) return Promise.resolve({ data: [{ id: 10, name: 'Budi' }] })
      if (url.includes('/cards')) return Promise.resolve({ data: [{ id: 20, card_no: 'V-001', status: 'available' }] })
      return Promise.resolve({ data: [] })
    })

    // First POST fails with 422 open visits conflict
    vi.mocked(api.post)
      .mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            message:
              'Pengunjung ini masih memiliki kunjungan terbuka (open visit).',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          message: 'Visit created',
          visit: { id: 101, ticket_number: '26/09/00001' },
        },
      })

    render(
      <MemoryRouter>
        <CreateVisit />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/id number/i), {
      target: { value: '1111222233334444' },
    })
    fireEvent.click(screen.getByRole('button', { name: /check|search/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Active Visitor Tamu')).toBeInTheDocument()
    })

    // Fill mandatory location & purpose
    fireEvent.change(screen.getByLabelText(/location/i), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText(/purpose of visit/i), {
      target: { value: 'Meeting Vendor' },
    })

    // Submit form
    fireEvent.click(
      screen.getByRole('button', { name: /save & print ticket/i })
    )

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
    })

    // Modal dialog should appear
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /kunjungan terbuka terdeteksi/i })
      ).toBeInTheDocument()
    })

    // Confirm close and check-in
    const confirmBtn = screen.getByRole('button', {
      name: /tutup kunjungan lama/i,
    })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenLastCalledWith(
        '/visits',
        expect.objectContaining({
          close_open_visits: true,
        })
      )
      expect(mockNavigate).toHaveBeenCalledWith('/visits/101/print', {
        state: { visit: { id: 101, ticket_number: '26/09/00001' } },
      })
    })
  })
})
