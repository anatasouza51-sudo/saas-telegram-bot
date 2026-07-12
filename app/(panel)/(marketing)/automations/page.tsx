import { AutomationsView } from "@/components/automations/automations-view"
import { listAutomations } from "@/app/actions/tg-automations"
import { listChannels } from "@/app/actions/tg-channels"
import { listTemplates } from "@/app/actions/tg-templates"
import { requireCapability } from "@/lib/session"

export default async function AutomationsPage() {
  await requireCapability("posts.manage")
  const [automations, channels, templates] = await Promise.all([
    listAutomations(),
    listChannels(),
    listTemplates(),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <AutomationsView
        automations={automations as never}
        channels={channels as never}
        templates={templates as never}
      />
    </div>
  )
}
