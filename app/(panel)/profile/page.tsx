import { DashboardProfileSection } from "@/components/dashboard-profile-section"
import { requireUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-2 pt-1 sm:px-3 md:px-4">
      <header className="rounded-[22px] border border-dashboard-border bg-dashboard-surface px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-dashboard-accent">Conta</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-dashboard-text sm:text-3xl">Meu perfil</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-dashboard-text-muted">
          Gerencie sua identidade, sua foto e as ações da sua conta em um único lugar.
        </p>
      </header>

      <DashboardProfileSection user={user} />
    </div>
  )
}
