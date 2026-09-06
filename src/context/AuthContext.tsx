// import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import api from "../lib/axios"

interface User {
  id: string
  name: string
  email: string
  roles?: { name: string }[]
  permissions?: { name: string }[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  hasRole: (role: string) => boolean
  hasPermission: (perm: string) => boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = async () => {
    try {
      if (token) {
        await api.post("/logout")
      }
    } catch (error) {
      console.error("Logout failed on backend:", error)
    } finally {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setToken(null)
      setUser(null)
    }
  }

  const hasRole = (role: string) => {
    if (!user || !user.roles) return false
    return user.roles.some((r: any) => r.name === role)
  }

  const hasPermission = (perm: string) => {
    return user?.permissions?.some((p) => p.name === perm) ?? false
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, hasRole, hasPermission, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
