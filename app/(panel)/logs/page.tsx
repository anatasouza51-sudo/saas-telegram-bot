import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { LogsView } from "@/components/logs/logs-view"
import { db } from "@/lib/db"
import { activityLogs } from "@/lib/db/schema"
import { desc } from "drizzle-orm"

export default async function LogsPage() {
  await requireCapability("logs.view")
  const logs = await db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(300)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Logs de Atividade"
        description="Auditoria completa de todas as ações administrativas e do sistema."
      />
      <LogsView logs={logs} />
    </div>
  )
}
