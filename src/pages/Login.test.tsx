import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import api from '../lib/axios'

const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    token: null,
    logout: vi.fn(),
    hasRole: vi.fn(),
    hasPermission: vi.fn(),
    loading: false,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../lib/axios')

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with Username or Email input and Password input', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('submits login payload and redirects on success', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        access_token: 'valid-jwt-token',
        user: { id: 1, name: 'Security Staff', username: 'SEC001' },
      },
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const loginInput = screen.getByLabelText(/username or email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(loginInput, { target: { value: 'sec001' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/login', {
        login: 'sec001',
        password: 'password123',
      })
      expect(mockLogin).toHaveBeenCalledWith('valid-jwt-token', {
        id: 1,
        name: 'Security Staff',
        username: 'SEC001',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/visits/create')
    })
  })

  it('displays error message on invalid credentials (401)', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: 'Invalid credentials' },
      },
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/username or email/i), {
      target: { value: 'wrong_user' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong_pass' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('displays rate limiting warning on 429 response', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 429,
        data: { message: 'Too Many Attempts.' },
      },
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/username or email/i), {
      target: { value: 'spam_user' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/too many login attempts/i)
      ).toBeInTheDocument()
    })
  })
})
