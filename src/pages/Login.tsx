import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import type { LoginResponse } from '../types/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({ login: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post<LoginResponse>('/login', {
        login: credentials.login.trim(),
        password: credentials.password,
      })
      login(res.data.access_token, res.data.user)
      navigate('/visits/create')
    } catch (err: unknown) {
      const maybeAxios = err as {
        response?: { status?: number; data?: { message?: string } }
      }
      if (maybeAxios?.response) {
        if (maybeAxios.response.status === 429) {
          setError(
            'Too many login attempts. Please wait a few moments before trying again.'
          )
        } else {
          setError(
            maybeAxios.response.data?.message || 'Invalid credentials'
          )
        }
      } else {
        setError('Login failed. Please check your network connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 rounded-xl bg-white p-8 shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            VMS Portal
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to active visitor directory
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-600 font-semibold border border-red-200 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="login"
                className="text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300"
              >
                Username or Email
              </label>
              <input
                id="login"
                name="login"
                type="text"
                autoComplete="username"
                required
                value={credentials.login}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:ring-zinc-300"
                placeholder="Username or email address"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={credentials.password}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:ring-zinc-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-zinc-900 py-2 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-zinc-500 mt-4">
            (Security Default: SEC001 / password123)
            <br />
            (Admin Default: admin@vms.local / password123)
          </p>
        </form>
      </div>
    </div>
  )
}
