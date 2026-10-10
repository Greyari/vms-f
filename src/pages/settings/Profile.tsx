import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuth } from "@/context/AuthContext"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, KeyRound, Shield, CheckCircle2 } from "lucide-react"

export default function Profile() {
  const { user, token, login } = useAuth()

  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    email: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  })

  const [passwordError, setPasswordError] = useState("")
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
      })
    }
  }, [user])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingProfile(true)
    try {
      const payload = {
        name: profileForm.name.trim(),
        username: profileForm.username.trim() ? profileForm.username.trim().toUpperCase() : null,
        email: profileForm.email.trim() ? profileForm.email.trim().toLowerCase() : null,
      }
      const res = await api.put("/profile", payload)
      toast.success("Profil berhasil diperbarui.")
      if (res.data?.user && token) {
        login(token, res.data.user)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Gagal memperbarui profil.")
    } finally {
      setLoadingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      setPasswordError("Konfirmasi password baru tidak cocok.")
      return
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordError("Password baru minimal 6 karakter.")
      return
    }

    setLoadingPassword(true)
    try {
      await api.put("/profile/password", passwordForm)
      toast.success("Password berhasil diubah.")
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      })
    } catch (error: any) {
      console.error(error)
      const msg = error.response?.data?.message || "Gagal mengubah password."
      setPasswordError(msg)
      toast.error(msg)
    } finally {
      setLoadingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Profil Saya (My Profile)
        </h1>
        <p className="text-sm text-zinc-500">
          Kelola informasi identitas pribadi, kredensial login, dan kata sandi akun Anda.
        </p>
      </div>

      {/* Identity Summary Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {user?.name || "Nama Pengguna"}
              </h2>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-500">
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                  {user?.username ? `@${user.username}` : "@USER"}
                </span>
                <span>•</span>
                <span>{user?.email || "Tidak ada email"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {user?.roles && user.roles.length > 0 ? (
              user.roles.map((r, i) => {
                const roleName = typeof r === "string" ? r : r.name
                const roleKey = typeof r === "string" ? r : r.id || `${r.name}-${i}`
                return (
                  <Badge
                    key={roleKey}
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700 capitalize dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {roleName}
                  </Badge>
                )
              })
            ) : (
              <Badge variant="outline">User</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Profile Form */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Informasi Profil
            </h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name-input" className="text-xs">
                Nama Lengkap
              </Label>
              <Input
                id="profile-name-input"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, name: e.target.value })
                }
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-username-input" className="text-xs">
                Username Login <span className="text-zinc-400 font-normal">(opsional jika ada email)</span>
              </Label>
              <Input
                id="profile-username-input"
                placeholder="cth. POS1 atau ADMIN"
                value={profileForm.username}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    username: e.target.value.toUpperCase(),
                  })
                }
                className="h-9 text-sm font-mono uppercase"
              />
              <p className="text-[11px] text-zinc-500">
                Huruf besar otomatis. Dapat digunakan sebagai identitas login cepat.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email-input" className="text-xs">
                Alamat Email <span className="text-zinc-400 font-normal">(opsional jika ada username)</span>
              </Label>
              <Input
                id="profile-email-input"
                type="email"
                placeholder="cth. user@vms.local"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
                className="h-9 text-sm"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              className="w-full gap-2 mt-2"
              disabled={loadingProfile}
            >
              {loadingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Perbarui Profil
            </Button>
          </form>
        </div>

        {/* Password Form */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Ubah Password
            </h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                {passwordError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="current-password-input" className="text-xs">
                Password Saat Ini
              </Label>
              <Input
                id="current-password-input"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    current_password: e.target.value,
                  })
                }
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password-input" className="text-xs">
                Password Baru
              </Label>
              <Input
                id="new-password-input"
                type="password"
                placeholder="Minimal 6 karakter..."
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    new_password: e.target.value,
                  })
                }
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password-input" className="text-xs">
                Konfirmasi Password Baru
              </Label>
              <Input
                id="confirm-password-input"
                type="password"
                value={passwordForm.new_password_confirmation}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    new_password_confirmation: e.target.value,
                  })
                }
                className="h-9 text-sm"
                required
              />
            </div>

            <Button
              type="submit"
              size="sm"
              className="w-full gap-2 mt-2"
              disabled={loadingPassword}
            >
              {loadingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Ubah Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
