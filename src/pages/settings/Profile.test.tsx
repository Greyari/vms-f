import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Profile from './Profile'
import api from '@/lib/axios'

vi.mock('@/lib/axios')

const mockUser = {
  id: 'u-1',
  name: 'Ahmad Dahlan',
  username: 'POS1',
  email: 'pos1@vms.local',
  roles: ['security'],
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    hasPermission: () => true,
    hasRole: () => true,
  }),
}))

describe('Profile Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.put).mockResolvedValue({ data: { message: 'Success' } })
  })

  it('renders current profile information including username and role', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    expect(screen.getByText(/Profil Saya/i)).toBeInTheDocument()
    expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument()
    expect(screen.getByText('@POS1')).toBeInTheDocument()
    expect(screen.getByText('security')).toBeInTheDocument()
  })

  it('validates password confirmation and submits password update', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    const currentPwd = screen.getByLabelText(/Password Saat Ini/i)
    const newPwd = screen.getByLabelText(/^Password Baru/i)
    const confirmPwd = screen.getByLabelText(/Konfirmasi Password Baru/i)

    fireEvent.change(currentPwd, { target: { value: 'oldpass123' } })
    fireEvent.change(newPwd, { target: { value: 'newpass123' } })
    fireEvent.change(confirmPwd, { target: { value: 'mismatched123' } })

    const updatePwdBtn = screen.getByRole('button', { name: /Ubah Password/i })
    fireEvent.click(updatePwdBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Konfirmasi password baru tidak cocok/i)
      ).toBeInTheDocument()
    })
    expect(api.put).not.toHaveBeenCalled()

    // Fix confirmation
    fireEvent.change(confirmPwd, { target: { value: 'newpass123' } })
    fireEvent.click(updatePwdBtn)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/profile/password',
        expect.objectContaining({
          current_password: 'oldpass123',
          new_password: 'newpass123',
          new_password_confirmation: 'newpass123',
        })
      )
    })
  })

  it('submits profile information update to PUT /api/profile', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    const nameInput = screen.getByLabelText(/Nama Lengkap/i)
    fireEvent.change(nameInput, { target: { value: 'Ahmad Dahlan Update' } })

    const updateProfileBtn = screen.getByRole('button', { name: /Perbarui Profil/i })
    fireEvent.click(updateProfileBtn)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/profile',
        expect.objectContaining({
          name: 'Ahmad Dahlan Update',
        })
      )
    })
  })
})
