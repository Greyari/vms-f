import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "@/lib/axios"
import { useAuth } from "@/context/AuthContext"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function Profile() {
  const { user } = useAuth()

  const [profileForm, setProfileForm] = useState({ name: "", email: "" })
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  })

  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, email: user.email })
    }
  }, [user])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingProfile(true)
    try {
      await api.put("/profile", profileForm)
      toast.success("Profile updated successfully! Refresh to see changes.")
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Failed to update profile.")
    } finally {
      setLoadingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingPassword(true)
    try {
      await api.put("/profile/password", passwordForm)
      toast.success("Password updated successfully!")
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      })
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.message || "Failed to update password.")
    } finally {
      setLoadingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-lg font-semibold">Profile Information</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm({ ...profileForm, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={profileForm.email}
              onChange={(e) =>
                setProfileForm({ ...profileForm, email: e.target.value })
              }
              required
            />
          </div>
          <Button type="submit" disabled={loadingProfile}>
            {loadingProfile && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Profile
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-lg font-semibold">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  current_password: e.target.value,
                })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  new_password: e.target.value,
                })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwordForm.new_password_confirmation}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  new_password_confirmation: e.target.value,
                })
              }
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={loadingPassword}>
            {loadingPassword && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Password
          </Button>
        </form>
      </div>
    </div>
  )
}
