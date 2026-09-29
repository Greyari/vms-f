import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import BlacklistedVisitors from './BlacklistedVisitors'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockBlacklistData = [
  {
    id: 99,
    visitor_no: 'VIS-2026-0099',
    id_type: 'ktp',
    id_number: '2171019999990001',
    name: 'Doni Kusuma',
    company: 'PT Logistik Maju',
    is_blacklisted: true,
    blacklist_reason: 'Melanggar SOP dermaga barat',
    blacklisted_at: '2026-07-20 14:00:00',
  },
]

describe('BlacklistedVisitors Master Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/export')) {
        return Promise.resolve({ data: new Blob(['excel data']) })
      }
      return Promise.resolve({
        data: {
          data: mockBlacklistData,
          current_page: 1,
          last_page: 1,
          total: 1,
        },
      })
    })
  })

  it('renders blacklisted visitors with visitor_no, name, and reason', async () => {
    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('VIS-2026-0099')).toBeInTheDocument()
      expect(screen.getByText('Doni Kusuma')).toBeInTheDocument()
      expect(screen.getByText('2171019999990001')).toBeInTheDocument()
      expect(screen.getByText('Melanggar SOP dermaga barat')).toBeInTheDocument()
    })
  })

  it('triggers unblacklist API call on confirmation', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: 'Visitor removed from blacklist' },
    })

    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Doni Kusuma')).toBeInTheDocument()
    })

    const unblacklistBtn = screen.getByRole('button', { name: /unblacklist|cabut blacklist/i })
    fireEvent.click(unblacklistBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /pencabutan blacklist|remove from blacklist/i })).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole('button', { name: /cabut blacklist|ya, cabut|confirm/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/visitors/99/unblacklist')
    })
  })

  it('opens add blacklist dialog when Tambah Blacklist button is clicked', async () => {
    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Doni Kusuma')).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /tambah blacklist/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tambah ke daftar blacklist/i })).toBeInTheDocument()
    })
  })

  it('queues a promotion to the global blacklist with a fixed category and a local note (hybrid PE-5)', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'o-1', status: 'pending' } } })
    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    fireEvent.click(await screen.findByRole('button', { name: /naikkan ke global/i }))
    expect(await screen.findByRole('heading', { name: /naikkan ke blacklist global/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/kategori alasan/i), { target: { value: 'misconduct' } })
    fireEvent.click(screen.getAllByRole('button', { name: /naikkan ke global/i }).at(-1) as HTMLElement)

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/global-blacklists', {
        visitor_id: 99,
        reason_category: 'misconduct',
        local_note: 'Melanggar SOP dermaga barat',
      })
    )
  })

  it('triggers export API call when Export Excel button is clicked', async () => {
    render(
      <BrowserRouter>
        <BlacklistedVisitors />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Doni Kusuma')).toBeInTheDocument()
    })

    const exportBtn = screen.getByRole('button', { name: /export excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/visitors/blacklisted/export', expect.anything())
    })
  })
})
