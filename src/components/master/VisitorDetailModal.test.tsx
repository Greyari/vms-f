import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VisitorDetailModal from './VisitorDetailModal'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockVisitorProfile = {
  id: 10,
  visitor_no: 'VIS-2026-0010',
  id_type: 'ktp',
  id_number: '3201012345678901',
  name: 'Bambang Sudirman',
  company: 'PT Samudera Bahari',
  occupation: 'Marine Engineer',
  pob: 'Surabaya',
  dob: '1985-05-12',
  gender: 'M',
  nationality: 'Indonesia',
  phone: '081234567890',
  email: 'bambang@samudera.com',
  address: 'Jl. Samudera No. 45, Batam',
  visitor_type: 'crew',
  is_blacklisted: true,
  blacklist_reason: 'Pelanggaran SOP keselamatan area dermaga',
  blacklisted_at: '2026-08-01 10:00:00',
  certificate_no: 'CERT-MAR-9988',
  seaman_book_no: 'SB-IDN-4455',
  vessel: {
    id: 3,
    name: 'TB Megamas 01',
  },
  visits: [
    {
      id: 101,
      ticket_no: 'TKT-20260901-0001',
      check_in_at: '2026-09-01 08:30:00',
      check_out_at: '2026-09-01 17:00:00',
      status: 'closed',
      location: { name: 'Dermaga 2' },
      staff: { name: 'Agus Wijaya' },
      purpose: 'Inspeksi Mesin Utama',
    },
    {
      id: 102,
      ticket_no: 'TKT-20260915-0045',
      check_in_at: '2026-09-15 09:00:00',
      check_out_at: null,
      status: 'open',
      location: { name: 'Kapal Repair Dock 1' },
      staff: { name: 'Hendra Susanto' },
      purpose: 'Perbaikan Sistem Hidrolik',
    },
  ],
}

describe('VisitorDetailModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      data: mockVisitorProfile,
    })
  })

  it('renders visitor personal and identity info correctly', async () => {
    render(
      <VisitorDetailModal
        open={true}
        onOpenChange={vi.fn()}
        visitorId={10}
      />
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/visitors/10')
      expect(screen.getByText('VIS-2026-0010')).toBeInTheDocument()
      expect(screen.getByText('Bambang Sudirman')).toBeInTheDocument()
      expect(screen.getByText('3201012345678901')).toBeInTheDocument()
      expect(screen.getByText('PT Samudera Bahari')).toBeInTheDocument()
      expect(screen.getByText('Marine Engineer')).toBeInTheDocument()
      expect(screen.getByText('081234567890')).toBeInTheDocument()
      expect(screen.getByText('bambang@samudera.com')).toBeInTheDocument()
    })
  })

  it('displays maritime and seaman documents for crew visitor', async () => {
    render(
      <VisitorDetailModal
        open={true}
        onOpenChange={vi.fn()}
        visitorId={10}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('CERT-MAR-9988')).toBeInTheDocument()
      expect(screen.getByText('SB-IDN-4455')).toBeInTheDocument()
      expect(screen.getByText('TB Megamas 01')).toBeInTheDocument()
    })
  })

  it('displays prominent blacklist warning banner when visitor is blacklisted', async () => {
    render(
      <VisitorDetailModal
        open={true}
        onOpenChange={vi.fn()}
        visitorId={10}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/pelanggaran sop keselamatan area dermaga/i)).toBeInTheDocument()
      expect(screen.getByText(/pengunjung ini berada dalam daftar blacklist/i)).toBeInTheDocument()
    })
  })

  it('renders visit history with tickets, dates, and locations on tab switch', async () => {
    render(
      <VisitorDetailModal
        open={true}
        onOpenChange={vi.fn()}
        visitorId={10}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Bambang Sudirman')).toBeInTheDocument()
    })

    const historyTab = screen.getByRole('tab', { name: /riwayat kunjungan/i })
    fireEvent.click(historyTab)

    await waitFor(() => {
      expect(screen.getByText('TKT-20260901-0001')).toBeInTheDocument()
      expect(screen.getByText('Dermaga 2')).toBeInTheDocument()
      expect(screen.getByText('Agus Wijaya')).toBeInTheDocument()
      expect(screen.getByText('TKT-20260915-0045')).toBeInTheDocument()
      expect(screen.getByText('Kapal Repair Dock 1')).toBeInTheDocument()
      expect(screen.getByText('Hendra Susanto')).toBeInTheDocument()
      expect(screen.getByText(/masih aktif/i)).toBeInTheDocument()
    })
  })
})
