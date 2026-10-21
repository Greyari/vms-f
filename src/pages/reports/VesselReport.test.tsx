import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import VesselReport from './VesselReport'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Supervisor User', roles: ['supervisor'] },
    hasPermission: (perm: string) =>
      ['view_reports', 'export_visits'].includes(perm),
    hasRole: (role: string) => role === 'supervisor',
  }),
}))

const sampleListShipsResponse = {
  data: [
    {
      id: 'va-1',
      location_id: 'loc-1',
      vessel_name: 'MV Samudera Pasifik',
      sign_in_date: '2026-09-20',
      sign_in_port: 'Singapura',
      sign_out_date: null,
      sign_out_port: null,
      total_days: 4,
      captain: 'Capt. Haddock',
      local_agent_company: 'PT Agen Lokal',
      foreign_agent_company: 'Oceanic Agents Ltd',
      vessel: {
        id: 'loc-1',
        code: 'IMO-9876543',
        name: 'MV Samudera Pasifik',
        type: 'repair_vessel',
      },
    },
  ],
  current_page: 1,
  last_page: 1,
  total: 1,
}

const sampleListShipsWithCrewResponse = {
  data: [
    {
      id: 'va-1',
      location_id: 'loc-1',
      vessel_name: 'MV Samudera Pasifik',
      sign_in_date: '2026-09-20',
      sign_in_port: 'Singapura',
      sign_out_date: null,
      sign_out_port: null,
      total_days: 4,
      captain: 'Capt. Haddock',
      vessel: {
        id: 'loc-1',
        code: 'IMO-9876543',
        name: 'MV Samudera Pasifik',
        type: 'repair_vessel',
      },
      crew: [
        {
          id: 'c-1',
          visitor_no: 200001,
          name: 'John Silver',
          id_type: 'passport',
          id_number: 'P12345678',
          gender: 'male',
          occupation: 'Chief Engineer',
          nationality: 'Filipina',
          certificate: 'COC Class 1',
          seaman_book_no: 'SB-998877',
        },
      ],
    },
  ],
  current_page: 1,
  last_page: 1,
  total: 1,
}

describe('VesselReport Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    window.URL.revokeObjectURL = vi.fn()

    vi.mocked(api.get).mockImplementation(async (url: string, config?: any) => {
      if (url === '/reports/vessels') {
        const mode = config?.params?.mode
        if (mode === 'list_ships_with_crew') {
          return { data: sampleListShipsWithCrewResponse }
        }
        return { data: sampleListShipsResponse }
      }
      if (url === '/reports/vessels/export') {
        return { data: new Blob(['fake-vessel-excel']) }
      }
      return { data: {} }
    })
  })

  it('renders mode List Ships from API GET /reports/vessels?mode=list_ships', async () => {
    render(
      <MemoryRouter>
        <VesselReport />
      </MemoryRouter>
    )

    expect(screen.getByText(/Laporan Kedatangan Kapal|Vessel Arrival Report/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('MV Samudera Pasifik')).toBeInTheDocument()
      expect(screen.getByText('IMO-9876543')).toBeInTheDocument()
      expect(screen.getByText('Capt. Haddock')).toBeInTheDocument()
      expect(screen.getByText(/4 (Hari|Days)/i)).toBeInTheDocument()
      expect(screen.getByText('IN PORT')).toBeInTheDocument()
    })
  })

  it('switches to List Ships With Crew mode and renders crew manifest', async () => {
    render(
      <MemoryRouter>
        <VesselReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('MV Samudera Pasifik')).toBeInTheDocument()
    })

    const withCrewTab = screen.getByRole('button', { name: /Rincian Bersama Kru|Detailed With Crew/i })
    fireEvent.click(withCrewTab)

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/reports/vessels',
        expect.objectContaining({
          params: expect.objectContaining({
            mode: 'list_ships_with_crew',
          }),
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText('John Silver')).toBeInTheDocument()
      expect(screen.getByText('Chief Engineer')).toBeInTheDocument()
      expect(screen.getByText('SB-998877')).toBeInTheDocument()
    })
  })

  it('submits stay_status filter parameter to API', async () => {
    render(
      <MemoryRouter>
        <VesselReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('MV Samudera Pasifik')).toBeInTheDocument()
    })

    const vesselInput = screen.getByPlaceholderText(/Nama kapal|vessel name/i)
    fireEvent.change(vesselInput, { target: { value: 'Samudera' } })

    const searchButton = screen.getByRole('button', { name: /Terapkan Filter|Apply Filter|Filter/i })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/reports/vessels',
        expect.objectContaining({
          params: expect.objectContaining({
            vessel_name: 'Samudera',
          }),
        })
      )
    })
  })

  it('triggers Excel export blob download for vessel report', async () => {
    render(
      <MemoryRouter>
        <VesselReport />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('MV Samudera Pasifik')).toBeInTheDocument()
    })

    const exportBtn = screen.getByRole('button', { name: /Export Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/reports/vessels/export',
        expect.objectContaining({
          responseType: 'blob',
          params: expect.objectContaining({
            mode: 'list_ships',
          }),
        })
      )
    })
  })
})
