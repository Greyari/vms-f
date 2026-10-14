import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Visitors from './Visitors'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const sampleVisitors = [
  {
    id: 1,
    visitor_no: 'VIS-2026-0001',
    id_type: 'ktp',
    id_number: '1234567890123456',
    name: 'John Doe',
    company: 'PT Subsea Marine',
    visitor_type: 'contractor',
    is_blacklisted: false,
    visits_count: 5,
  },
  {
    id: 2,
    visitor_no: 'VIS-2026-0002',
    id_type: 'passport',
    id_number: 'A98765432',
    name: 'Captain Jack',
    company: 'Pacific Shipping',
    visitor_type: 'crew',
    is_blacklisted: true,
    visits_count: 12,
  },
]

describe('Visitors Master Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/visitors/export')) {
        return Promise.resolve({ data: new Blob(['excel data']) })
      }
      return Promise.resolve({
        data: {
          data: sampleVisitors,
          current_page: 1,
          last_page: 1,
          total: 2,
        },
      })
    })
  })

  it('renders visitor list with visitor_no, visitor_type badge, and blacklist badge', async () => {
    render(
      <BrowserRouter>
        <Visitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('VIS-2026-0001')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getAllByText(/contractor/i).length).toBeGreaterThanOrEqual(1)

      expect(screen.getByText('VIS-2026-0002')).toBeInTheDocument()
      expect(screen.getByText('Captain Jack')).toBeInTheDocument()
      expect(screen.getAllByText(/crew/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/blacklisted/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('filters by visitor_type when dropdown changes', async () => {
    render(
      <BrowserRouter>
        <Visitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('VIS-2026-0001')).toBeInTheDocument()
    })

    const typeFilter = screen.getByLabelText(/tipe pengunjung/i)
    fireEvent.change(typeFilter, { target: { value: 'contractor' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/visitors', expect.objectContaining({
        params: expect.objectContaining({
          visitor_type: 'contractor',
        }),
      }))
    })
  })

  it('opens VisitorDetailModal when Detail button is clicked', async () => {
    render(
      <BrowserRouter>
        <Visitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const detailButtons = screen.getAllByRole('button', { name: /detail/i })
    fireEvent.click(detailButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /detail profil pengunjung/i })).toBeInTheDocument()
    })
  })

  it('opens VisitorFormModal when Tambah Pengunjung button is clicked', async () => {
    render(
      <BrowserRouter>
        <Visitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /tambah pengunjung|tambah/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /pendaftaran pengunjung baru/i })).toBeInTheDocument()
    })
  })

  it('opens VisitorFormModal in edit mode when Edit button is clicked', async () => {
    render(
      <BrowserRouter>
        <Visitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit data pengunjung/i })).toBeInTheDocument()
    })
  })
})
