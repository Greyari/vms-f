import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Users from './Users'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin', roles: ['administrator'] },
    hasPermission: () => true,
    hasRole: () => true,
  }),
}))

const sampleUsers = [
  {
    id: 'u-1',
    name: 'Admin User',
    username: 'ADMIN',
    email: 'admin@vms.local',
    is_active: true,
    roles: [{ id: 1, name: 'administrator' }],
  },
  {
    id: 'u-2',
    name: 'Security Pos 1',
    username: 'POS1',
    email: null,
    is_active: true,
    roles: [{ id: 2, name: 'security' }],
  },
]

const sampleRoles = [
  { id: 1, name: 'administrator' },
  { id: 2, name: 'security' },
  { id: 3, name: 'supervisor' },
]

describe('Users Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/users') {
        return { data: sampleUsers }
      }
      if (url === '/roles') {
        return { data: sampleRoles }
      }
      return { data: [] }
    })
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'User created' } })
    vi.mocked(api.put).mockResolvedValue({ data: { message: 'User updated' } })
    vi.mocked(api.delete).mockResolvedValue({ data: { message: 'User deleted' } })
  })

  it('renders user list with username, email, and role badge', async () => {
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    )

    expect(screen.getByText(/Manajemen Pengguna/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('@ADMIN')).toBeInTheDocument()
      expect(screen.getByText('admin@vms.local')).toBeInTheDocument()
      expect(screen.getByText('administrator')).toBeInTheDocument()

      expect(screen.getByText('Security Pos 1')).toBeInTheDocument()
      expect(screen.getByText('@POS1')).toBeInTheDocument()
      expect(screen.getByText('security')).toBeInTheDocument()
    })
  })

  it('validates that at least username or email is filled', async () => {
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /Tambah Pengguna/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByText(/Tambah Pengguna Baru/i)).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/Nama Lengkap/i)
    fireEvent.change(nameInput, { target: { value: 'User Baru' } })

    const passwordInput = screen.getByLabelText(/^Password/i)
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    const saveBtn = screen.getByRole('button', { name: /Simpan Pengguna/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Minimal satu dari Username atau Email wajib diisi/i)
      ).toBeInTheDocument()
    })

    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits new user with valid username and role', async () => {
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /Tambah Pengguna/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByText(/Tambah Pengguna Baru/i)).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/Nama Lengkap/i)
    fireEvent.change(nameInput, { target: { value: 'Petugas Baru' } })

    const usernameInput = screen.getByLabelText(/Username Login/i)
    fireEvent.change(usernameInput, { target: { value: 'petugas2' } })

    const passwordInput = screen.getByLabelText(/^Password/i)
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    const saveBtn = screen.getByRole('button', { name: /Simpan Pengguna/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          name: 'Petugas Baru',
          username: 'PETUGAS2',
          password: 'password123',
        })
      )
    })
  })

  it('submits edit user via PUT /users/:id', async () => {
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Security Pos 1')).toBeInTheDocument()
    })

    const editBtns = screen.getAllByLabelText(/Edit Pengguna/i)
    fireEvent.click(editBtns[1])

    await waitFor(() => {
      expect(screen.getByText(/Edit Pengguna/i)).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/Nama Lengkap/i)
    fireEvent.change(nameInput, { target: { value: 'Security Pos 1 Baru' } })

    const saveBtn = screen.getByRole('button', { name: /Simpan Perubahan/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/users/u-2',
        expect.objectContaining({
          name: 'Security Pos 1 Baru',
        })
      )
    })
  })

  it('deletes user after confirmation dialog', async () => {
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Security Pos 1')).toBeInTheDocument()
    })

    const deleteBtns = screen.getAllByLabelText(/Hapus Pengguna/i)
    fireEvent.click(deleteBtns[1])

    await waitFor(() => {
      expect(screen.getByText(/Konfirmasi Hapus Pengguna/i)).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole('button', { name: /Hapus Akun/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/users/u-2')
    })
  })
})
