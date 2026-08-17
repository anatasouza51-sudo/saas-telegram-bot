"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Pencil, ShieldCheck, UserRound } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog"
import type { Role } from "@/lib/roles"

interface DashboardProfileUser {
  id: string
  name: string
  email: string
  role: Role
  storeId: string
  image?: string | null
}

export function DashboardProfileSection({ user }: { user: DashboardProfileUser }) {
  const router = useRouter()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const initials = useMemo(() => {
    const value = user.name?.trim() || user.email?.trim() || "U"
    return value
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }, [user.name, user.email])

  const handleSignOut = useCallback(async () => {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }, [router])

  return (
    <>
      <section className="overflow-hidden rounded-[22px] border border-dashboard-border bg-dashboard-surface">
        <div className="border-b border-dashboard-border/70 px-4 py-4 sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dashboard-text-muted">Perfil da operação</p>
          <p className="mt-1 text-xs text-dashboard-text-muted">Sua identidade e ações de conta em um único lugar.</p>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="dashboard-3d-icon flex size-14 shrink-0 items-center justify-center rounded-2xl bg-dashboard-accent/10 p-1">
              <Avatar className="size-full rounded-xl">
                {user.image && <AvatarImage src={user.image} alt={user.name} className="object-cover" />}
                <AvatarFallback className="rounded-xl bg-dashboard-accent text-dashboard-bg text-sm font-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-bold text-dashboard-text">{user.name || "Usuário da operação"}</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-dashboard-accent/25 bg-dashboard-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-dashboard-accent">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  {user.role === "admin" ? "Admin" : "Operador"}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-dashboard-text-muted">{user.email}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-dashboard-text-muted/70">
                <UserRound className="size-3" aria-hidden="true" />
                Identidade da conta
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="dashboard-3d-control h-10 justify-center gap-2 rounded-xl border-dashboard-border bg-dashboard-bg/40 px-4 text-xs font-bold text-dashboard-text hover:border-dashboard-accent/50 hover:bg-dashboard-surface-elevated"
              onClick={() => setProfileDialogOpen(true)}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Editar perfil
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 justify-center gap-2 rounded-xl px-4 text-xs font-bold text-dashboard-text-muted hover:bg-destructive/10 hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </Button>
          </div>
        </div>
      </section>

      <ProfileSettingsDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={user}
      />
    </>
  )
}
