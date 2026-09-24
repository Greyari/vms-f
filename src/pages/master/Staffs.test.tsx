import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Staffs from './Staffs'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const sampleStaffs = [
  {
    id: 'staff-1',
    staff_id: 'EMP-001',
    name: 'Budi Santoso',
    department: 'Commercial',
    company: 'PT Cemara Intan',
    is_active: true,
  },
  {
    id: 'staff-2',
    staff_id: 'EMP-002',
    name: 'Siti Aminah',
    department: 'HSE',
    company: 'PT ASL Shipyard',
    is_active: false,
  },
]

describe('Staffs Master Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/staffs/trashed')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({
        data: {
          data: sampleStaffs,
          current_page: 1,
          last_page: 1,
          total: 2,
        },
      })
    })
  })

  it('renders staff list with Staff ID, Name, Department, and status', async () => {
    render(<Staffs />)

    await waitFor(() => {
      expect(screen.getByText('EMP-001')).toBeInTheDocument()
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
      expect(screen.getByText('Commercial')).toBeInTheDocument()
      expect(screen.getByText('EMP-002')).toBeInTheDocument()
      expect(screen.getByText('Siti Aminah')).toBeInTheDocument()
      expect(screen.getByText('HSE')).toBeInTheDocument()
    })
  })

  it('filters staff by is_active status when dropdown changes', async () => {
    render(<Staffs />)

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    const statusFilter = screen.getByLabelText(/status aktif/i)
    fireEvent.change(statusFilter, { target: { value: '1' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/staffs', expect.objectContaining({
        params: expect.objectContaining({
          is_active: '1',
        }),
      }))
    })
  })

  it('submits new staff with staff_id, name, and department to POST /staffs', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        id: 'staff-3',
        staff_id: 'EMP-003',
        name: 'Ahmad Dahlan',
        department: 'Operations',
        is_active: true,
      },
    })

    render(<Staffs />)

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /tambah staf|tambah/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tambah data staf/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/staff id \/ nik/i), {
      target: { value: 'EMP-003' },
    })

    fireEvent.change(screen.getByLabelText(/nama lengkap/i), {
      target: { value: 'Ahmad Dahlan' },
    })

    fireEvent.change(screen.getByLabelText(/departemen/i), {
      target: { value: 'Operations' },
    })

    const saveButton = screen.getByRole('button', { name: /simpan/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/staffs', expect.objectContaining({
        staff_id: 'EMP-003',
        name: 'Ahmad Dahlan',
        department: 'Operations',
      }))
    })
  })

  it('deletes staff member on confirmation', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { message: 'Staff deleted successfully' } })

    render(<Staffs />)

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /hapus/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /konfirmasi hapus/i })).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /ya, hapus/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/staffs/staff-1')
    })
  })
})
