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

    // If we receive a 401 Unauthorized, automatically log out the user.
    // Guard against a redirect loop when we're already on the login page.
    if (status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    // A 403 means authenticated-but-forbidden: surface it without logging out.
    if (status === 403) {
      toast.error(
        error.response?.data?.message ||
          "You do not have permission to perform this action."
      )
    }

    return Promise.reject(error)
  }
)

export default api
