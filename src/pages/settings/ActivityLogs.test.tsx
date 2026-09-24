import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ActivityLogs from './ActivityLogs'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', roles: ['administrator'] },
    hasPermission: () => true,
    hasRole: () => true,
  }),
}))

const sampleLogs = [
  {
    id: 'log-1',
    causer_id: 'u-2',
    causer_name: 'Security Guard',
    causer_username: 'POS1',
    causer_email: null,
    action: 'created',
    subject_type: 'Visit',
    subject_id: 'vis-101',
    subject_label: 'Tiket 26/09/00001',
    old_values: null,
    new_values: { ticket_number: '26/09/00001', visitor_name: 'Ahmad' },
    ip_address: '192.168.1.10',
    created_at: '2026-09-24 10:00:00',
  },
  {
    id: 'log-2',
    causer_id: 'u-1',
    causer_name: 'Administrator',
    causer_username: 'ADMIN',
    causer_email: 'admin@vms.local',
    action: 'updated',
    subject_type: 'Visitor',
    subject_id: 'v-50',
    subject_label: 'John Doe',
    old_values: { company: 'PT Lama' },
    new_values: { company: 'PT Baru' },
    ip_address: '192.168.1.1',
    created_at: '2026-09-24 09:30:00',
  },
]

describe('ActivityLogs Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes('/activity-logs/subject-types')) {
        return { data: ['Visit', 'Visitor', 'User'] }
      }
      if (url.includes('/activity-logs')) {
        return {
          data: {
            data: sampleLogs,
            current_page: 1,
            last_page: 1,
            total: 2,
          },
        }
      }
      return { data: [] }
    })
  })

  it('renders activity logs list with causer_username', async () => {
    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    )

    expect(
      screen.getByRole('heading', { name: /Log Aktivitas/i })
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('@POS1')).toBeInTheDocument()
      expect(screen.getByText('Tiket 26/09/00001')).toBeInTheDocument()
      expect(screen.getByText('192.168.1.10')).toBeInTheDocument()

      expect(screen.getByText('@ADMIN')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('opens detail inspection modal showing old and new values', async () => {
    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('@ADMIN')).toBeInTheDocument()
    })

    const detailBtns = screen.getAllByLabelText(/Lihat Detail Log/i)
    fireEvent.click(detailBtns[1])

    await waitFor(() => {
      expect(screen.getByText(/Detail Log Aktivitas/i)).toBeInTheDocument()
      expect(screen.getByText(/PT Lama/i)).toBeInTheDocument()
      expect(screen.getByText(/PT Baru/i)).toBeInTheDocument()
    })
  })

  it('triggers search when filter action changes', async () => {
    render(
      <MemoryRouter>
        <ActivityLogs />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('@POS1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Cari pelaku atau subjek/i)
    fireEvent.change(searchInput, { target: { value: 'POS1' } })

    const searchBtn = screen.getByRole('button', { name: /Cari/i })
    fireEvent.click(searchBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/activity-logs',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'POS1',
          }),
        })
      )
    })
  })
})
