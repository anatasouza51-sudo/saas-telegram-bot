import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { LogsView } from "@/components/logs/logs-view"
import { getLogs } from "@/lib/queries/records"

export default async function LogsPage() {
  const user = await requireCapability("logs.view")
  const logs = await getLogs(user.storeId, 300)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* PageHeader removed for cleaner UI */}
      <LogsView logs={logs} />
    </div>
  )
}
