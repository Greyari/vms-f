export interface RoleItem {
  id?: number | string
  name: string
  [key: string]: unknown
}

export interface PermissionItem {
  id?: number | string
  name: string
  [key: string]: unknown
}

export interface User {
  id: number | string
  name: string
  username?: string | null
  email?: string | null
  roles?: (RoleItem | string)[]
  permissions?: (PermissionItem | string)[]
  [key: string]: unknown
}

export interface LoginResponse {
  message: string
  access_token: string
  token_type: string
  user: User
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => Promise<void>
  hasRole: (role: string) => boolean
  hasPermission: (perm: string) => boolean
  loading: boolean
}
