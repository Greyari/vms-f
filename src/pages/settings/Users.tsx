import { useState, useEffect, useMemo, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
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
  DialogDescription,
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
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
} from "lucide-react"

export interface UserRole {
  id: number | string
  name: string
}

export interface UserItem {
  id: string
  name: string
  username?: string | null
  email?: string | null
  is_active: boolean
  roles?: UserRole[]
}

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [rolesOptions, setRolesOptions] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Search & Pagination
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const perPage = 100

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [form, setForm] = useState({
    id: null as string | null,
    name: "",
    username: "",
    email: "",
    password: "",
    role: "security",
    is_active: true,
  })

  // Delete dialog states
  const [alertOpen, setAlertOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/users")
      const rows: UserItem[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.data ?? [])
      setUsers(rows)
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat daftar pengguna.")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get("/roles")
      const roles: UserRole[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.data ?? [])
      setRolesOptions(roles)
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [fetchUsers, fetchRoles])

  // Filtered & Paginated
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    )
  }, [users, search])

  const totalPages = Math.ceil(filteredUsers.length / perPage) || 1
  const displayedUsers = useMemo(() => {
    const start = (page - 1) * perPage
    return filteredUsers.slice(start, start + perPage)
  }, [filteredUsers, page, perPage])

  const handleOpenCreate = () => {
    setForm({
      id: null,
      name: "",
      username: "",
      email: "",
      password: "",
      role: rolesOptions[0]?.name || "security",
      is_active: true,
    })
    setValidationError("")
    setModalOpen(true)
  }

  const handleOpenEdit = (user: UserItem) => {
    const firstRole = user.roles?.[0]
    const primaryRole =
      typeof firstRole === "string"
        ? firstRole
        : firstRole?.name || "security"
    setForm({
      id: user.id,
      name: user.name,
      username: user.username || "",
      email: user.email || "",
      password: "",
      role: primaryRole,
      is_active: user.is_active ?? true,
    })
    setValidationError("")
    setModalOpen(true)
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError("")

    if (!form.name.trim()) {
      setValidationError("Nama pengguna tidak boleh kosong.")
      return
    }

    if (!form.username.trim() && !form.email.trim()) {
      setValidationError("Minimal satu dari Username atau Email wajib diisi.")
      return
    }

    if (!form.id && (!form.password || form.password.length < 8)) {
      setValidationError("Password wajib diisi minimal 8 karakter untuk pengguna baru.")
      return
    }

    if (form.id && form.password && form.password.length < 8) {
      setValidationError("Password baru minimal 8 karakter jika ingin diubah.")
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        username: form.username.trim() ? form.username.trim().toUpperCase() : null,
        email: form.email.trim() ? form.email.trim().toLowerCase() : null,
        roles: [form.role],
        role: form.role,
        is_active: form.is_active,
      }

      if (form.password) {
        payload.password = form.password
      }

      if (form.id) {
        await api.put(`/users/${form.id}`, payload)
        toast.success("Pengguna berhasil diperbarui.")
      } else {
        await api.post("/users", payload)
        toast.success("Pengguna baru berhasil ditambahkan.")
      }

      setModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      console.error(err)
      const msg = err.response?.data?.message || "Gagal menyimpan pengguna."
      setValidationError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedUserId) return
    try {
      await api.delete(`/users/${selectedUserId}`)
      toast.success("Pengguna berhasil dihapus.")
      setAlertOpen(false)
      setSelectedUserId(null)
      fetchUsers()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || "Gagal menghapus pengguna.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Manajemen Pengguna (System Users)
          </h1>
          <p className="text-sm text-zinc-500">
            Kelola akun petugas pos keamanan, supervisor gerbang, dan administrator sistem.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Cari nama, username, atau email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table Data */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Pengguna</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role Hak Akses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                    <span className="mt-2 block text-xs">Memuat daftar pengguna...</span>
                  </TableCell>
                </TableRow>
              ) : displayedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-zinc-500 text-xs">
                    Tidak ada pengguna yang cocok dengan pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                displayedUsers.map((u, index) => {
                  const roleName = u.roles?.[0]?.name || "security"
                  return (
                    <TableRow key={u.id} className="text-xs">
                      <TableCell className="text-center text-zinc-500 font-mono">
                        {(page - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                        {u.name}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                        {u.username ? `@${u.username}` : "-"}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400">
                        {u.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            roleName === "administrator"
                              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                              : roleName === "supervisor"
                                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                          }
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          {roleName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_active ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-zinc-200 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            Nonaktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Edit Pengguna"
                            onClick={() => handleOpenEdit(u)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Hapus Pengguna"
                            onClick={() => {
                              setSelectedUserId(u.id)
                              setAlertOpen(true)
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          <div>
            Total <strong className="text-zinc-900 dark:text-zinc-100">{filteredUsers.length}</strong> pengguna
          </div>
          <div className="flex items-center gap-2">
            <span>
              Halaman {page} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="h-7 w-7 p-0"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((prev) => prev + 1)}
              className="h-7 w-7 p-0"
              aria-label="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Form Modal (Create / Edit) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit Pengguna" : "Tambah Pengguna Baru"}
            </DialogTitle>
            <DialogDescription>
              Kelola kredensial login, username, email, dan peran RBAC pengguna sistem.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            {validationError && (
              <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                {validationError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="user-name-input" className="text-xs">Nama Lengkap</Label>
              <Input
                id="user-name-input"
                placeholder="cth. Ahmad Dahlan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-username-input" className="text-xs">
                  Username Login
                </Label>
                <Input
                  id="user-username-input"
                  placeholder="cth. POS1"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="h-9 text-sm font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-email-input" className="text-xs">
                  Alamat Email
                </Label>
                <Input
                  id="user-email-input"
                  type="email"
                  placeholder="petugas@vms.local"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password-input" className="text-xs">
                Password {form.id && <span className="text-zinc-400 font-normal">(kosongkan jika tidak diubah)</span>}
              </Label>
              <Input
                id="user-password-input"
                type="password"
                placeholder="Minimal 8 karakter..."
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Role Hak Akses (RBAC)</Label>
              <Select
                value={form.role}
                onValueChange={(val) => setForm({ ...form, role: val })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  {rolesOptions.length > 0 ? (
                    rolesOptions.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="security">security</SelectItem>
                      <SelectItem value="supervisor">supervisor</SelectItem>
                      <SelectItem value="administrator">administrator</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                id="user-active-checkbox"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
              />
              <Label htmlFor="user-active-checkbox" className="text-sm font-medium cursor-pointer">
                Akun Pengguna Aktif
              </Label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {form.id ? "Simpan Perubahan" : "Simpan Pengguna"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus akun pengguna ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAlertOpen(false)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Hapus Akun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
