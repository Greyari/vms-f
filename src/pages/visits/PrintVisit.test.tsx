import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PrintVisit from './PrintVisit'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Petugas Jaga Gerbang' },
  }),
}))

const sampleVisit = {
  id: 301,
  ticket_number: '26/09/00301',
  visitor: {
    name: 'Ir. Hendra Gunawan',
    id_type: 'ktp',
    id_number: '2171010101010001',
    company: 'PT Surveyor Indonesia',
  },
  visitor_company: 'PT Surveyor Indonesia',
  location_name: 'Graving Dock 1',
  host_name: 'Bpk. Suryanto',
  purpose: 'Survey Ketebalan Plat Lambung',
  time_in: '09:15',
  date: '2026-09-24',
  vehicle_no: 'BP 9876 XY',
  visitor_cards: [{ card_no: 'VIS-99' }],
  printed_by: 'Petugas Jaga Gerbang',
}

describe('PrintVisit Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders pass details directly from navigation state', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/visits/301/print', state: { visit: sampleVisit } },
        ]}
      >
        <Routes>
          <Route path="/visits/:id/print" element={<PrintVisit />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/26\/09\/00301/i)).toBeInTheDocument()
    expect(screen.getByText(/Ir. Hendra Gunawan/i)).toBeInTheDocument()
    expect(screen.getByText(/Graving Dock 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Petugas Jaga Gerbang/i)).toBeInTheDocument()
  })

  it('falls back to GET /api/visits/:id/print when state is empty', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { visit: sampleVisit },
    })

    render(
      <MemoryRouter initialEntries={['/visits/301/print']}>
        <Routes>
          <Route path="/visits/:id/print" element={<PrintVisit />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/visits/301/print')
      expect(screen.getByText(/26\/09\/00301/i)).toBeInTheDocument()
      expect(screen.getByText(/Ir. Hendra Gunawan/i)).toBeInTheDocument()
      expect(screen.getByText(/Graving Dock 1/i)).toBeInTheDocument()
    })
  })
})
