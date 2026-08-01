import { requireCapability } from "@/lib/session"
import { LogsView } from "@/components/logs/logs-view"
import { getLogs } from "@/lib/queries/records"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function LogsPage() {
  let user
  try {
    user = await requireCapability("logs.view")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/logs" />
  }

  const logs = await safeLoad("getLogs", () => getLogs(user.storeId, 300), [])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <LogsView logs={logs} />
    </div>
  )
}
