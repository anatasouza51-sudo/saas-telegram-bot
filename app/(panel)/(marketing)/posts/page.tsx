import { PostsWorkspace } from "@/components/posts/posts-workspace"
import { listChannels } from "@/app/actions/tg-channels"
import { listPosts, listSchedules, getPostStats, getPostReports } from "@/app/actions/tg-posts"
import { listMedia } from "@/app/actions/tg-media"
import { listTemplates } from "@/app/actions/tg-templates"
import { listTopics } from "@/app/actions/tg-topics"
import { getStoreTelegram } from "@/lib/tg/config"
import { requireCapability } from "@/lib/session"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export const maxDuration = 60 // 60 seconds

export default async function PostsPage() {
  // Auth runs outside the try: `requireCapability` redirects unauthenticated
  // users via a control-flow exception that must never be caught here.
  const user = await requireCapability("posts.manage")

  try {
    const tg = await getStoreTelegram(user.storeId)

    const [
      channelsResult,
      topicsResult,
      postsResult,
      schedulesResult,
      statsResult,
      mediaResult,
      templatesResult,
      reportsResult,
    ] = await Promise.allSettled([
      listChannels(),
      listTopics(),
      listPosts("all"),
      listSchedules(),
      getPostStats(),
      listMedia(),
      listTemplates(),
      getPostReports(),
    ])

    // Extract values with robust fallbacks for failed promises
    const channels = channelsResult.status === "fulfilled" ? (channelsResult.value ?? []) : []
    const topics = topicsResult.status === "fulfilled" ? (topicsResult.value ?? []) : []
    const posts = postsResult.status === "fulfilled" ? (postsResult.value ?? []) : []
    const schedules = schedulesResult.status === "fulfilled" ? (schedulesResult.value ?? []) : []
    const stats = statsResult.status === "fulfilled" ? (statsResult.value ?? { total: 0, sent: 0, failed: 0, scheduled: 0, draft: 0, today: 0, week: 0, month: 0 }) : { total: 0, sent: 0, failed: 0, scheduled: 0, draft: 0, today: 0, week: 0, month: 0 }
    const media = mediaResult.status === "fulfilled" ? (mediaResult.value ?? []) : []
    const templates = templatesResult.status === "fulfilled" ? (templatesResult.value ?? []) : []
    const reports = reportsResult.status === "fulfilled" ? (reportsResult.value ?? []) : []

    // Resolve the bot's display name for the live preview (best-effort).
    let botName = "Seu Bot"
    if (tg.client) {
      try {
        const me = await tg.client.getMe()
        if (me?.ok && me?.result) {
          botName = me.result.first_name || me.result.username || botName
        }
      } catch (meError) {
        console.error("[PostsPage] getMe failed:", meError)
      }
    }

    return (
      <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-hidden">
        <PostsWorkspace
          channels={channels}
          topics={topics}
          posts={posts}
          schedules={schedules}
          stats={stats}
          media={media}
          templates={templates}
          reports={reports}
          botName={botName}
          cdnReady={Boolean(tg.client && tg.cdnChatId)}
        />
      </div>
    )
  } catch (error) {
    console.error("[PostsPage] Erro ao renderizar:", error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-lg font-bold text-destructive">
          Erro ao carregar a página de postagens.
        </p>
        <p className="text-sm text-muted-foreground">
          Tente recarregar a página em instantes.
        </p>
        <a href="/posts">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </Button>
        </a>
      </div>
    )
  }
}
