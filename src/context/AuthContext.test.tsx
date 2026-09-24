import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import type { User } from '../types/auth'

vi.mock('../lib/axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initializes with null user and token when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('restores user and token from localStorage', () => {
    const dummyUser: User = {
      id: 1,
      name: 'Security Officer',
      username: 'SEC001',
      email: 'sec@example.com',
      roles: [{ name: 'security' }],
      permissions: [{ name: 'view_visits' }],
    }
    localStorage.setItem('token', 'sample-token-123')
    localStorage.setItem('user', JSON.stringify(dummyUser))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    expect(result.current.token).toBe('sample-token-123')
    expect(result.current.user).toEqual(dummyUser)
  })

  it('login updates state and localStorage', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    const newUser: User = {
      id: 2,
      name: 'Supervisor User',
      username: 'SPV001',
      email: 'spv@example.com',
      roles: ['supervisor'],
      permissions: ['view_visits', 'view_reports'],
    }

    act(() => {
      result.current.login('new-jwt-token', newUser)
    })

    expect(result.current.token).toBe('new-jwt-token')
    expect(result.current.user).toEqual(newUser)
    expect(localStorage.getItem('token')).toBe('new-jwt-token')
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual(newUser)
  })

  it('logout clears state and localStorage', async () => {
    const dummyUser: User = {
      id: 1,
      name: 'Security Officer',
      username: 'SEC001',
      roles: [{ name: 'security' }],
    }
    localStorage.setItem('token', 'sample-token-123')
    localStorage.setItem('user', JSON.stringify(dummyUser))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('hasRole handles role object and role string', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    expect(result.current.hasRole('security')).toBe(false)

    act(() => {
      result.current.login('token', {
        id: 1,
        name: 'Officer',
        roles: [{ name: 'security' }, 'gate_keeper'],
      })
    })

    expect(result.current.hasRole('security')).toBe(true)
    expect(result.current.hasRole('gate_keeper')).toBe(true)
    expect(result.current.hasRole('administrator')).toBe(false)
  })

  it('hasPermission handles permission object and permission string', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    expect(result.current.hasPermission('create_visits')).toBe(false)

    act(() => {
      result.current.login('token', {
        id: 1,
        name: 'Officer',
        permissions: [{ name: 'create_visits' }, 'view_visits'],
      })
    })

    expect(result.current.hasPermission('create_visits')).toBe(true)
    expect(result.current.hasPermission('view_visits')).toBe(true)
    expect(result.current.hasPermission('delete_visits')).toBe(false)
  })
})
