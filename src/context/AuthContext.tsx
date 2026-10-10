import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import api from "../lib/axios"
import type { User, AuthContextType } from "../types/auth"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")

    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error("Failed to parse stored user from localStorage:", e)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      }
    }
    setLoading(false)
  }, [])

  const login = (newToken: string, newUser: User) => {
    const finalUser: User = {
      ...newUser,
      roles: newUser.roles ?? user?.roles ?? [],
      permissions: newUser.permissions ?? user?.permissions ?? [],
    }
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(finalUser))
    setToken(newToken)
    setUser(finalUser)
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

  const hasRole = (role: string): boolean => {
    if (!user || !user.roles) return false
    return user.roles.some((r) => {
      if (typeof r === "string") return r === role
      return r.name === role
    })
  }

  const hasPermission = (perm: string): boolean => {
    if (!user || !user.permissions) return false
    return user.permissions.some((p) => {
      if (typeof p === "string") return p === perm
      return p.name === perm
    })
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
export type { User, AuthContextType }
