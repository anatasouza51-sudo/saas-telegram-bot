import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { AdminsView } from "@/components/admins/admins-view"
import { getAdmins } from "@/app/actions/admins"

export default async function AdminsPage() {
  const user = await requireCapability("admins.manage")
  const admins = await getAdmins()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
      <AdminsView admins={admins} currentUserId={user.id} />
    </div>
  )
}
