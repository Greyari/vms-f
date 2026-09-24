import axios from "axios"
import { toast } from "sonner"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ""

    // Check-KTP requests: backend returns 200 with data: null for unregistered visitors.
    // Suppress toasts on check-ktp probes.
    const isCheckKtpProbe = url.includes("/visitors/check-ktp/")

    // 401 Unauthorized: automatically log out user if not on login page
    if (status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    } else if (status === 403) {
      toast.error(
        error.response?.data?.message ||
          "You do not have permission to perform this action."
      )
    } else if (status === 429) {
      toast.error(
        error.response?.data?.message ||
          "Too many requests. Please wait a moment before trying again."
      )
    } else if (status && status >= 500) {
      toast.error("A server error occurred. Please contact the administrator.")
    } else if (
      !isCheckKtpProbe &&
      status &&
      status >= 400 &&
      status !== 401 &&
      status !== 422
    ) {
      // General unexpected client error toast (exclude 422 validation handled in form)
      toast.error(error.response?.data?.message || "An unexpected error occurred.")
    }

    return Promise.reject(error)
  }
)

export default api
