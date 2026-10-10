import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuth } from "@/context/AuthContext"

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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

export default function Roles() {
  // Decision FE-3-ROLE: built-in roles (is_builtin from the API) are re-synced by the seeder,
  // so they open read-only; changing any role also needs manage_roles.
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_roles")
  const [readOnly, setReadOnly] = useState(false)
  const [roles, setRoles] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<{
    id: string | null
    name: string
    permissions: string[]
  }>({ id: null, name: "", permissions: [] })

  const [alertOpen, setAlertOpen] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const res = await api.get("/roles")
      setRoles(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const res = await api.get("/permissions")
      setPermissions(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const openForm = (role: any = null, viewOnly = false) => {
    setReadOnly(viewOnly)
    if (role) {
      setForm({
        id: role.id,
        name: role.name,
        permissions: role.permissions
          ? role.permissions.map((p: any) => p.name)
          : [],
      })
    } else {
      setForm({ id: null, name: "", permissions: [] })
    }
    setModalOpen(true)
  }

  const togglePermission = (permName: string) => {
    setForm((prev) => {
      if (prev.permissions.includes(permName)) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => p !== permName),
        }
      }
      return { ...prev, permissions: [...prev.permissions, permName] }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (form.id) {
        await api.put(`/roles/${form.id}`, form)
      } else {
        await api.post("/roles", form)
      }
      setModalOpen(false)
      toast.success("Role saved")
      fetchRoles()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Failed to save role")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (id: string) => {
    setSelectedRoleId(id)
    setAlertOpen(true)
  }

  const executeDelete = async () => {
    if (!selectedRoleId) return
    try {
      await api.delete(`/roles/${selectedRoleId}`)
      toast.success("Role deleted")
      fetchRoles()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Failed to delete role")
    } finally {
      setAlertOpen(false)
      setSelectedRoleId(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Role Management</h1>
        {canManage && <Button onClick={() => openForm()}>Add Role</Button>}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="border-b bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Permissions Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-zinc-500"
                  >
                    No roles found.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium capitalize">
                      {role.name}
                      {role.is_builtin && (
                        <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 normal-case dark:bg-amber-900/40 dark:text-amber-200">
                          Bawaan
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800">
                        {role.permissions?.length || 0} Permissions
                      </span>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {role.is_builtin || !canManage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openForm(role, true)}
                        >
                          Lihat
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openForm(role)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => confirmDelete(role.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[85vh] sm:max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {readOnly ? "Lihat Role" : form.id ? "Edit Role" : "Add Role"}
            </DialogTitle>
            <DialogDescription>
              {readOnly
                ? "Role bawaan dikelola seeder sistem dan tidak bisa diubah langsung. Anda dapat menyalin hak aksesnya ke role kustom baru."
                : "Atur nama role dan pilih izin/hak akses (permissions) yang dimiliki role ini."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Nama Role</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="cth. supervisor_lapangan"
                disabled={readOnly}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Daftar Hak Akses (Permissions) — ({form.permissions.length} dipilih)
                </Label>
                {!readOnly && permissions.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setForm({
                          ...form,
                          permissions: permissions.map((p) => p.name),
                        })
                      }
                    >
                      Pilih Semua
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setForm({ ...form, permissions: [] })}
                    >
                      Batal Semua
                    </Button>
                  </div>
                )}
              </div>

              {/* Categorized Permissions Grid */}
              <div className="space-y-4">
                {[
                  {
                    title: "1. Kunjungan & Tamu (Visits)",
                    filter: (p: any) =>
                      p.name.includes("visit") && !p.name.includes("report") && !p.name.includes("export"),
                  },
                  {
                    title: "2. Master Data (Cards, Staff, Location, Visitor)",
                    filter: (p: any) =>
                      p.name.includes("card") ||
                      p.name.includes("staff") ||
                      p.name.includes("location") ||
                      p.name.includes("visitor") ||
                      p.name.includes("blacklist"),
                  },
                  {
                    title: "3. Kedatangan Kapal (Vessels)",
                    filter: (p: any) => p.name.includes("vessel"),
                  },
                  {
                    title: "4. Laporan & Ekspor (Reports)",
                    filter: (p: any) =>
                      p.name.includes("report") || p.name.includes("export"),
                  },
                  {
                    title: "5. Pengaturan Sistem & Audit Log",
                    filter: (p: any) =>
                      p.name.includes("user") ||
                      p.name.includes("role") ||
                      p.name.includes("log"),
                  },
                ].map((category, idx) => {
                  const catPerms = permissions.filter(category.filter)
                  if (catPerms.length === 0) return null

                  const allCatSelected = catPerms.every((p) =>
                    form.permissions.includes(p.name)
                  )

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40"
                    >
                      <div className="mb-2.5 flex items-center justify-between border-b pb-1.5 dark:border-zinc-800">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {category.title}
                        </span>
                        {!readOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            onClick={() => {
                              const permNames = catPerms.map((p) => p.name)
                              if (allCatSelected) {
                                setForm((prev) => ({
                                  ...prev,
                                  permissions: prev.permissions.filter(
                                    (name) => !permNames.includes(name)
                                  ),
                                }))
                              } else {
                                setForm((prev) => ({
                                  ...prev,
                                  permissions: Array.from(
                                    new Set([...prev.permissions, ...permNames])
                                  ),
                                }))
                              }
                            }}
                          >
                            {allCatSelected ? "Batal Kategori Ini" : "Pilih Semua Kategori Ini"}
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                        {catPerms.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-center space-x-2 rounded bg-white p-2 border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={form.permissions.includes(perm.name)}
                              onCheckedChange={() => togglePermission(perm.name)}
                              disabled={readOnly}
                            />
                            <label
                              htmlFor={`perm-${perm.id}`}
                              className="text-xs font-mono text-zinc-700 dark:text-zinc-300 cursor-pointer"
                            >
                              {perm.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Uncategorized permissions if any */}
                {(() => {
                  const categorizedIds = new Set(
                    permissions
                      .filter(
                        (p) =>
                          p.name.includes("visit") ||
                          p.name.includes("card") ||
                          p.name.includes("staff") ||
                          p.name.includes("location") ||
                          p.name.includes("visitor") ||
                          p.name.includes("blacklist") ||
                          p.name.includes("vessel") ||
                          p.name.includes("report") ||
                          p.name.includes("export") ||
                          p.name.includes("user") ||
                          p.name.includes("role") ||
                          p.name.includes("log")
                      )
                      .map((p) => p.id)
                  )
                  const otherPerms = permissions.filter(
                    (p) => !categorizedIds.has(p.id)
                  )
                  if (otherPerms.length === 0) return null

                  return (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="mb-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Lainnya
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {otherPerms.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-center space-x-2 rounded bg-white p-2 border dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={form.permissions.includes(perm.name)}
                              onCheckedChange={() => togglePermission(perm.name)}
                              disabled={readOnly}
                            />
                            <label
                              htmlFor={`perm-${perm.id}`}
                              className="text-xs font-mono text-zinc-700 dark:text-zinc-300"
                            >
                              {perm.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {permissions.length === 0 && (
                  <div className="text-center py-6 text-sm text-zinc-500">
                    Memuat permissions...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-4 dark:border-zinc-800">
              {readOnly && canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReadOnly(false)
                    setForm({
                      id: null,
                      name: `${form.name}_custom`,
                      permissions: [...form.permissions],
                    })
                    toast.info(
                      "Role disalin sebagai template kustom baru. Anda dapat mengubah nama dan hak aksesnya lalu menyimpannya."
                    )
                  }}
                >
                  Salin ke Role Kustom Baru
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  {readOnly ? "Tutup" : "Cancel"}
                </Button>
                {!readOnly && (
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Role"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Users with this role might lose
              their access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
