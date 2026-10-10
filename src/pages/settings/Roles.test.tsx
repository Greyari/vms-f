import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import Roles from "./Roles"
import api from "@/lib/axios"

vi.mock("@/lib/axios")

let permissions: string[] = []
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Admin", roles: ["administrator"] },
    hasPermission: (p: string) => permissions.includes(p),
    hasRole: () => true,
  }),
}))

const roles = [
  {
    id: "r-1",
    name: "security",
    is_builtin: true,
    permissions: [{ id: 1, name: "view_visits" }],
  },
  {
    id: "r-2",
    name: "gate trainee",
    is_builtin: false,
    permissions: [{ id: 1, name: "view_visits" }],
  },
]

// Decision FE-3-ROLE: the seeder re-syncs built-in roles, so the UI must not pretend they are editable.
describe("Roles settings page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions = ["view_roles", "manage_roles"]
    vi.mocked(api.get).mockImplementation((url: string) =>
      Promise.resolve(
        url === "/roles"
          ? { data: roles }
          : {
              data: [
                { id: 1, name: "view_visits" },
                { id: 2, name: "create_visits" },
              ],
            }
      )
    )
  })

  it("shows a built-in role with edit permissions and a custom role as fully editable", async () => {
    render(<Roles />)

    const builtInRow = (await screen.findByText("security")).closest(
      "tr"
    ) as HTMLElement
    expect(within(builtInRow).getByText(/bawaan/i)).toBeInTheDocument()
    expect(
      within(builtInRow).getByRole("button", { name: /edit/i })
    ).toBeInTheDocument()
    expect(
      within(builtInRow).queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument()

    const customRow = screen
      .getByText("gate trainee")
      .closest("tr") as HTMLElement
    expect(
      within(customRow).getByRole("button", { name: /edit/i })
    ).toBeInTheDocument()
    expect(
      within(customRow).getByRole("button", { name: /delete/i })
    ).toBeInTheDocument()
  })

  it("opens a built-in role with locked name field", async () => {
    render(<Roles />)

    const builtInRow = (await screen.findByText("security")).closest(
      "tr"
    ) as HTMLElement
    fireEvent.click(within(builtInRow).getByRole("button", { name: /edit/i }))

    const dialog = await screen.findByRole("dialog")
    const nameInput = within(dialog).getByLabelText(/nama role/i)
    expect(nameInput).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: /save/i })
    ).toBeInTheDocument()
  })

  it("hides every change control from a user who may only view roles", async () => {
    permissions = ["view_roles"]
    render(<Roles />)

    await screen.findByText("gate trainee")
    expect(
      screen.queryByRole("button", { name: /add role/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /edit/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/roles"))
  })
})
