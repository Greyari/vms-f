import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App"
import api from "@/lib/axios"
import { ROUTE_PERMISSIONS } from "@/lib/routePermissions"

vi.mock("@/lib/axios")

// Decision FE-2: the sidebar already hid these screens, but typing the URL opened them.
function signInAs(permissions: string[]) {
  localStorage.clear()
  localStorage.setItem("token", "mock-valid-token")
  localStorage.setItem(
    "user",
    JSON.stringify({
      id: 1,
      name: "Gate Officer",
      roles: ["security"],
      permissions,
    })
  )
}

describe("route guards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Refused users land on the dashboard, which reads its stats object on mount.
    vi.mocked(api.get).mockImplementation((url: string) =>
      Promise.resolve(
        url === "/dashboard"
          ? {
              data: {
                stats: {
                  active_visits: 0,
                  blacklisted_visitors: 0,
                  month_visits: 0,
                  total_visitors: 0,
                },
                chart: [],
                cards: { available: 0, in_use: 0, total: 0 },
                vehicle_cards: { available: 0, in_use: 0, total: 0 },
                recent_visits: [],
              },
            }
          : { data: [] }
      )
    )
  })

  it.each([
    "/master/locations",
    "/master/visitors/blacklist",
    "/settings/users",
    "/settings/logs",
    "/reports/visits",
    "/vessel-arrivals",
    "/settings/roles",
  ])(
    "sends a security officer who types %s back to the dashboard",
    async (path) => {
      signInAs(["view_visits", "create_visits", "checkout_visits"])
      window.history.pushState({}, "", path)

      render(<App />)

      await waitFor(() => expect(window.location.pathname).toBe("/"))
    }
  )

  it("lets a user with the permission stay on the screen", async () => {
    signInAs(["view_locations"])
    window.history.pushState({}, "", "/master/locations")

    render(<App />)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(window.location.pathname).toBe("/master/locations")
  })

  // Decision FE-3: Roles.tsx existed without a route.
  it("opens role management for a user who may view roles", async () => {
    signInAs(["view_roles"])
    window.history.pushState({}, "", "/settings/roles")

    render(<App />)

    expect(
      await screen.findByRole("heading", { name: /role management/i })
    ).toBeInTheDocument()
  })

  // Decision FE-3: an unknown path used to render an empty layout.
  it("answers an unknown path with a not-found page", async () => {
    signInAs(["view_visits"])
    window.history.pushState({}, "", "/does-not-exist")

    render(<App />)

    expect(
      await screen.findByRole("heading", { name: /halaman tidak ditemukan/i })
    ).toBeInTheDocument()
  })

  it("never guards the dashboard, which is where refused users land", () => {
    expect(Object.keys(ROUTE_PERMISSIONS)).not.toContain("/")
  })
})
