import { ChannelsView } from "@/components/channels/channels-view"
import {
  listChannels,
  getTelegramDiagnostics,
} from "@/app/actions/tg-channels"
import { listTopics } from "@/app/actions/tg-topics"
import { getStoreTelegram } from "@/lib/tg/config"
import { requireCapability } from "@/lib/session"

// Always render fresh: chats are auto-detected via webhook events, so the
// panel must reflect the latest state on every load / poll.
export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 seconds

export default async function ChannelsPage() {
  const user = await requireCapability("posts.manage")
  const results = await Promise.allSettled([
    listChannels(),
    listTopics(),
    getStoreTelegram(user.storeId),
    getTelegramDiagnostics(),
  ])

  const channels = results[0].status === "fulfilled" ? results[0].value : []
  const topics = results[1].status === "fulfilled" ? results[1].value : []
  const tg = results[2].status === "fulfilled" ? results[2].value : { token: "" }
  const diagnostics = results[3].status === "fulfilled" ? results[3].value : null

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <ChannelsView
        channels={channels}
        topics={topics}
        botConfigured={Boolean(tg.token)}
        diagnostics={diagnostics}
      />
    </div>
  )
}
