import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'
import api from '@/lib/axios'
import { resetAppConfigCache } from '@/lib/appConfig'

vi.mock('@/lib/axios')

describe('App Router Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('token', 'mock-valid-token')
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        name: 'Gate Officer',
        roles: ['security'],
        permissions: ['view_visits', 'create_visits'],
      })
    )

    resetAppConfigCache()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/app-config') {
        return Promise.resolve({
          data: { company_name: 'PT. ASL Shipyard Indonesia', company_address: '', logo_url: null, yard_code: 'ASL' },
        })
      }
      if (url.includes('/visits/reprint')) {
        return Promise.resolve({ data: [] })
      }
      if (url.includes('/reports/visits')) {
        return Promise.resolve({ data: { data: [], total: 0 } })
      }
      if (url.includes('/reports/vessels')) {
        return Promise.resolve({ data: { data: [], total: 0 } })
      }
      if (url.includes('/print')) {
        return Promise.resolve({
          data: {
            id: 101,
            ticket_number: '26/09/00101',
            visitor: { name: 'Ali', id_type: 'KTP', id_number: '1234567890' },
            location_name: 'Main Office',
            host_name: 'Pak Budi',
            printed_by: 'Gate Officer',
            date: '2026-09-24',
            time_in: '08:00',
          },
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('renders Reprint Pass page when navigating to /visits/reprint', async () => {
    window.history.pushState({}, 'Reprint Pass', '/visits/reprint')

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /cetak ulang pass kunjungan/i })
      ).toBeInTheDocument()
    })
  })

  it('renders PrintVisit page when navigating to /visits/:id/print', async () => {
    window.history.pushState({}, 'Print Pass', '/visits/101/print')

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'PT. ASL SHIPYARD INDONESIA' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'VISITOR ENTRY PASS' })
      ).toBeInTheDocument()
    })
  })

  it('renders Locations master page when navigating to /master/locations', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 2,
        name: 'Supervisor',
        roles: ['supervisor'],
        permissions: ['view_locations', 'manage_locations'],
      })
    )

    window.history.pushState({}, 'Locations Master', '/master/locations')

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /master lokasi & kapal/i })
      ).toBeInTheDocument()
    })
  })

  it('renders Vessel Arrivals page when navigating to /vessel-arrivals', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 2,
        name: 'Supervisor',
        roles: ['supervisor'],
        permissions: ['view_vessel_arrivals', 'manage_vessel_arrivals'],
      })
    )

    window.history.pushState({}, 'Crew Arrivals', '/vessel-arrivals')

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /kedatangan kapal & kru/i })
      ).toBeInTheDocument()
    })
  })

  it('renders Visitor Report page when navigating to /reports/visits', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 2,
        name: 'Supervisor',
        roles: ['supervisor'],
        permissions: ['view_reports'],
      })
    )

    window.history.pushState({}, 'Visitor Report', '/reports/visits')

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /laporan kunjungan \(visitor report\)/i })
      ).toBeInTheDocument()
    })
  })

  it('renders Vessel Report page when navigating to /reports/vessels', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 2,
        name: 'Supervisor',
        roles: ['supervisor'],
        permissions: ['view_reports'],
      })
    )

    window.history.pushState({}, 'Vessel Report', '/reports/vessels')

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /laporan kedatangan kapal \(vessel report\)/i })
      ).toBeInTheDocument()
    })
  })
})
