import { AutomationsView } from "@/components/automations/automations-view"
import { listAutomations } from "@/app/actions/tg-automations"
import { listChannels } from "@/app/actions/tg-channels"
import { listTemplates } from "@/app/actions/tg-templates"
import { requireCapability } from "@/lib/session"
import { ErrorView } from "@/components/error-view"

export const maxDuration = 60 // 60 seconds

export default async function AutomationsPage() {
  try {
    await requireCapability("posts.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/automations" />
  }

  const results = await Promise.allSettled([
    listAutomations(),
    listChannels(),
    listTemplates(),
  ])

  const automations = results[0].status === "fulfilled" ? results[0].value : []
  const channels = results[1].status === "fulfilled" ? results[1].value : []
  const templates = results[2].status === "fulfilled" ? results[2].value : []

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <AutomationsView
        automations={automations}
        channels={channels}
        templates={templates}
      />
    </div>
  )
}
