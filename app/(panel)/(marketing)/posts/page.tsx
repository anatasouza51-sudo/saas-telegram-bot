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

export default async function PostsPage() {
  // Auth runs outside the try: `requireCapability` redirects unauthenticated
  // users via a control-flow exception that must never be caught here.
  const user = await requireCapability("posts.manage")

  try {
    const tg = await getStoreTelegram(user.storeId)

    const results = await Promise.allSettled([
      listChannels(),
      listTopics(),
      listPosts("all"),
      listSchedules(),
      getPostStats(),
      listMedia(),
      listTemplates(),
      getPostReports(),
    ])

    // Extract values with fallbacks for failed promises
    const channels = results[0].status === "fulfilled" ? results[0].value : []
    const topics = results[1].status === "fulfilled" ? results[1].value : []
    const posts = results[2].status === "fulfilled" ? results[2].value : []
    const schedules = results[3].status === "fulfilled" ? results[3].value : []
    const stats = results[4].status === "fulfilled" ? results[4].value : { total: 0, sent: 0, failed: 0, scheduled: 0, draft: 0, today: 0, week: 0, month: 0 }
    const media = results[5].status === "fulfilled" ? results[5].value : []
    const templates = results[6].status === "fulfilled" ? results[6].value : []
    const reports = results[7].status === "fulfilled" ? results[7].value : []

    // Resolve the bot's display name for the live preview (best-effort).
    let botName = "Seu Bot"
    if (tg.client) {
      const me = await tg.client.getMe()
      if (me.ok && me.result) {
        botName = me.result.first_name || me.result.username || botName
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
