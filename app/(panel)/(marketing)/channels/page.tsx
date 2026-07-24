import { ChannelsView } from "@/components/channels/channels-view"
import {
  listChannels,
  getTelegramDiagnostics,
} from "@/app/actions/tg-channels"
import { getStoreTelegram } from "@/lib/tg/config"
import { requireCapability } from "@/lib/session"

// Always render fresh: chats are auto-detected via webhook events, so the
// panel must reflect the latest state on every load / poll.
export const dynamic = "force-dynamic"

export default async function ChannelsPage() {
  const user = await requireCapability("posts.manage")
  const [channels, tg, diagnostics] = await Promise.all([
    listChannels(),
    getStoreTelegram(user.storeId),
    // Diagnostics are optional context; the page still renders without them.
    getTelegramDiagnostics().catch((err) => {
      console.error("[channels] diagnostics unavailable:", err)
      return null
    }),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <ChannelsView
        channels={channels}
        botConfigured={Boolean(tg.token)}
        diagnostics={diagnostics}
      />
    </div>
  )
}
