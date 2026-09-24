import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VisitorFormModal from './VisitorFormModal'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

describe('VisitorFormModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits new visitor with full fields to POST /visitors in create mode', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 50,
        visitor_no: 'VIS-2026-0050',
        name: 'Ahmad Fauzi',
      },
    })

    const handleSuccess = vi.fn()
    const handleOpenChange = vi.fn()

    render(
      <VisitorFormModal
        open={true}
        onOpenChange={handleOpenChange}
        onSuccess={handleSuccess}
      />
    )

    expect(screen.getByRole('heading', { name: /pendaftaran pengunjung baru/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/nama lengkap/i), {
      target: { value: 'Ahmad Fauzi' },
    })

    fireEvent.change(screen.getByLabelText(/tipe identitas/i), {
      target: { value: 'ktp' },
    })

    fireEvent.change(screen.getByLabelText(/nomor identitas/i), {
      target: { value: '2171012345678901' },
    })

    fireEvent.change(screen.getByLabelText(/perusahaan/i), {
      target: { value: 'PT Duta Maritim' },
    })

    fireEvent.change(screen.getByLabelText(/nomor telepon/i), {
      target: { value: '081122334455' },
    })

    const submitButton = screen.getByRole('button', { name: /simpan|daftar/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/visitors', expect.objectContaining({
        name: 'Ahmad Fauzi',
        id_type: 'ktp',
        id_number: '2171012345678901',
        company: 'PT Duta Maritim',
        phone: '081122334455',
      }))
      expect(handleSuccess).toHaveBeenCalled()
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('populates initial data and submits updates to PUT /visitors/:id in edit mode', async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: { id: 50, name: 'Ahmad Fauzi Updated' },
    })

    const existingVisitor = {
      id: 50,
      visitor_no: 'VIS-2026-0050',
      name: 'Ahmad Fauzi',
      id_type: 'ktp',
      id_number: '2171012345678901',
      company: 'PT Duta Maritim',
      phone: '081122334455',
      is_blacklisted: false,
    }

    const handleSuccess = vi.fn()
    const handleOpenChange = vi.fn()

    render(
      <VisitorFormModal
        open={true}
        onOpenChange={handleOpenChange}
        visitor={existingVisitor}
        onSuccess={handleSuccess}
      />
    )

    expect(screen.getByRole('heading', { name: /edit data pengunjung/i })).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/nama lengkap/i)
    expect(nameInput).toHaveValue('Ahmad Fauzi')

    fireEvent.change(nameInput, {
      target: { value: 'Ahmad Fauzi Updated' },
    })

    const submitButton = screen.getByRole('button', { name: /simpan|perbarui/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/visitors/50', expect.objectContaining({
        name: 'Ahmad Fauzi Updated',
        id_type: 'ktp',
        id_number: '2171012345678901',
      }))
      expect(handleSuccess).toHaveBeenCalled()
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('disables identity fields and displays security note if visitor is blacklisted', async () => {
    const blacklistedVisitor = {
      id: 51,
      name: 'Blacklisted User',
      id_type: 'ktp',
      id_number: '2171099999999999',
      is_blacklisted: true,
      blacklist_reason: 'Pelanggaran keamanan berat',
    }

    render(
      <VisitorFormModal
        open={true}
        onOpenChange={vi.fn()}
        visitor={blacklistedVisitor}
        onSuccess={vi.fn()}
      />
    )

    const idTypeSelect = screen.getByLabelText(/tipe identitas/i)
    const idNumberInput = screen.getByLabelText(/nomor identitas/i)

    expect(idTypeSelect).toBeDisabled()
    expect(idNumberInput).toBeDisabled()
    expect(screen.getByText(/nomor identitas pengunjung blacklist dikunci demi integritas keamanan/i)).toBeInTheDocument()
  })

  it('shows crew fields when visitor_type is crew', async () => {
    render(
      <VisitorFormModal
        open={true}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    const visitorTypeSelect = screen.getByLabelText(/tipe pengunjung/i)
    fireEvent.change(visitorTypeSelect, { target: { value: 'crew' } })

    await waitFor(() => {
      expect(screen.getByLabelText(/nomor sertifikat/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/buku pelaut/i)).toBeInTheDocument()
    })
  })
})
