import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  requiredPermission?: string | readonly string[]
  requiredRole?: string
}

export const ProtectedRoute = ({
  requiredPermission,
  requiredRole,
}: ProtectedRouteProps = {}) => {
  const { token, loading, hasPermission, hasRole } = useAuth()

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (requiredPermission) {
    const hasPerm = typeof requiredPermission === "string"
      ? hasPermission(requiredPermission)
      : requiredPermission.some((p) => hasPermission(p))
    if (!hasPerm) {
      return <Navigate to="/" replace />
    }
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
