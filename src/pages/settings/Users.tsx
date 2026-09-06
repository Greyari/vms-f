import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  Loader2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react"

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const [form, setForm] = useState({
    id: null as string | null,
    name: "",
    email: "",
    password: "",
    roles: [] as string[],
  })
  const [rolesOptions, setRolesOptions] = useState<any[]>([])

  // Alert Dialog States
  const [alertOpen, setAlertOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // Advanced Table States
  const [search, setSearch] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get("/users")
      setUsers(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await api.get("/roles")
      setRolesOptions(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const openForm = (user: any = null) => {
    if (user) {
      setForm({
        id: user.id,
        name: user.name,
        email: user.email,
        password: "",
        roles: user.roles ? user.roles.map((r: any) => r.name) : [],
      })
    } else {
      setForm({ id: null, name: "", email: "", password: "", roles: [] })
    }
    setModalOpen(true)
  }

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const filteredAndSorted = useMemo(() => {
    let result = [...users]
    if (search) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.email.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "asc" ? -1 : 1
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }
    return result
  }, [users, search, sortConfig])

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAndSorted.slice(start, start + itemsPerPage)
  }, [filteredAndSorted, currentPage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (form.id) {
        const payload: Record<string, any> = { ...form }
        if (!payload.password) delete payload.password // Don't send empty password
        await api.put(`/users/${form.id}`, payload)
      } else {
        await api.post("/users", form)
      }
      setModalOpen(false)
      toast.success("User saved")
      fetchUsers()
    } catch (error: any) {
      console.error(error)
      toast.error(
        error.response?.data?.message ||
          "Failed to save user. Check if email is duplicate."
      )
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (id: string) => {
    setSelectedUserId(id)
    setAlertOpen(true)
  }

  const executeDelete = async () => {
    if (!selectedUserId) return
    try {
      await api.delete(`/users/${selectedUserId}`)
      toast.success("User deleted")
      fetchUsers()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Failed to delete user")
    } finally {
      setAlertOpen(false)
      setSelectedUserId(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold">System Users</h1>
        <Button onClick={() => openForm()}>
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search user name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead
                  onClick={() => handleSort("name")}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    Name <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("email")}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    Email <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-zinc-500"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((user) => (
                  <TableRow
                    key={user.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${user.roles?.some((r: any) => r.name === "administrator") ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"}`}
                      >
                        {user.roles?.map((r: any) => r.name).join(", ") ||
                          "No Role"}
                      </span>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openForm(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(user.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            Showing{" "}
            {filteredAndSorted.length > 0
              ? (currentPage - 1) * itemsPerPage + 1
              : 0}{" "}
            to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)}{" "}
            of {filteredAndSorted.length} entries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={
                currentPage === totalPages || totalPages === 0 || loading
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>
                Password {form.id && "(Leave empty to keep current)"}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!form.id}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.roles[0] || ""}
                onValueChange={(val) => setForm({ ...form, roles: [val] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {rolesOptions.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                  {rolesOptions.length === 0 && (
                    <SelectItem value="user" disabled>
                      Loading Roles...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this user account. The user
              will no longer be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
