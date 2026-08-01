import { requireCapability } from "@/lib/session"
import { AdminsView } from "@/components/admins/admins-view"
import { getAdmins } from "@/app/actions/admins"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function AdminsPage() {
  let user
  try {
    user = await requireCapability("admins.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/admins" />
  }

  const admins = await safeLoad("getAdmins", () => getAdmins(), [])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
      <AdminsView admins={admins} currentUserId={user.id} />
    </div>
  )
}
