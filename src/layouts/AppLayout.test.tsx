import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import AppLayout from "./AppLayout"
import * as AuthContextModule from "../context/AuthContext"
import { ThemeProvider } from "../context/ThemeContext"
import type { User } from "../types/auth"

// The header's sync indicator polls /sync/status; nothing here should reach the network.
vi.mock("@/lib/axios", () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: null })), post: vi.fn() },
}))

describe("AppLayout RBAC Navigation", () => {
  const setupUserWithPermissions = (user: User) => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user,
      token: "mock-token",
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (role: string) =>
        user.roles?.some((r) =>
          typeof r === "string" ? r === role : r.name === role
        ) ?? false,
      hasPermission: (perm: string) =>
        user.permissions?.some((p) =>
          typeof p === "string" ? p === perm : p.name === perm
        ) ?? false,
      loading: false,
    })
  }

  it("renders ONLY gate operations for security role", () => {
    setupUserWithPermissions({
      id: 1,
      name: "Security Officer",
      username: "SEC001",
      roles: ["security"],
      permissions: [
        "view_visits",
        "create_visits",
        "edit_visits",
        "checkout_visits",
      ],
    })

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppLayout />
        </ThemeProvider>
      </MemoryRouter>
    )

    // Allowed gate menus
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Add Visit")).toBeInTheDocument()
    expect(screen.getByText("Active Visitors")).toBeInTheDocument()
    expect(screen.getByText("Reprint Pass")).toBeInTheDocument()

    // Disallowed menus must NOT be in document
    expect(screen.queryByText("Report")).not.toBeInTheDocument()
    expect(screen.queryByText("Visitor Report")).not.toBeInTheDocument()
    expect(screen.queryByText("Vessel Report")).not.toBeInTheDocument()
    expect(screen.queryByText("Crew Arrivals")).not.toBeInTheDocument()
    expect(screen.queryByText("Locations & Vessels")).not.toBeInTheDocument()
    expect(screen.queryByText("Staffs")).not.toBeInTheDocument()
    expect(screen.queryByText("Cards")).not.toBeInTheDocument()
    expect(screen.queryByText("System Users")).not.toBeInTheDocument()
    expect(screen.queryByText("Activity Logs")).not.toBeInTheDocument()
  })

  it("renders master data, crew arrivals, and reports for supervisor role", () => {
    setupUserWithPermissions({
      id: 2,
      name: "Supervisor User",
      username: "SPV001",
      roles: ["supervisor"],
      permissions: [
        "view_visits",
        "create_visits",
        "view_reports",
        "view_vessel_arrivals",
        "view_locations",
        "view_staffs",
        "view_cards",
        "view_visitors",
      ],
    })

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppLayout />
        </ThemeProvider>
      </MemoryRouter>
    )

    expect(screen.getByText("Crew Arrivals")).toBeInTheDocument()
    expect(screen.getByText("Locations & Vessels")).toBeInTheDocument()
    expect(screen.getByText("Visitor Report")).toBeInTheDocument()
    expect(screen.getByText("Vessel Report")).toBeInTheDocument()

    // Admin-only still hidden
    expect(screen.queryByText("System Users")).not.toBeInTheDocument()
    expect(screen.queryByText("Activity Logs")).not.toBeInTheDocument()
  })

  it("renders all menus including administration for admin role", () => {
    setupUserWithPermissions({
      id: 3,
      name: "Admin User",
      username: "ADM001",
      roles: ["administrator"],
      permissions: [
        "view_visits",
        "create_visits",
        "view_reports",
        "view_vessel_arrivals",
        "view_locations",
        "view_staffs",
        "view_cards",
        "view_visitors",
        "view_users",
        "view_logs",
      ],
    })

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppLayout />
        </ThemeProvider>
      </MemoryRouter>
    )

    expect(screen.getByText("System Users")).toBeInTheDocument()
    expect(screen.getByText("Activity Logs")).toBeInTheDocument()
  })
})
