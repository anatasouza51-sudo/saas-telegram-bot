import { PostsWorkspace } from "@/components/posts/posts-workspace"
import { listChannels } from "@/app/actions/tg-channels"
import { listPosts, listSchedules, getPostStats, getPostReports } from "@/app/actions/tg-posts"
import { listMedia } from "@/app/actions/tg-media"
import { listTemplates } from "@/app/actions/tg-templates"
import { getStoreTelegram } from "@/lib/tg/config"
import { requireCapability } from "@/lib/session"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default async function PostsPage() {
  try {
    const user = await requireCapability("posts.manage")
    const tg = await getStoreTelegram(user.storeId)

    const [channels, posts, schedules, stats, media, templates, reports] =
      await Promise.all([
        listChannels(),
        listPosts("all"),
        listSchedules(),
        getPostStats(),
        listMedia(),
        listTemplates(),
        getPostReports(),
      ])

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
          channels={channels as never}
          posts={posts as never}
          schedules={schedules as never}
          stats={stats as never}
          media={media as never}
          templates={templates as never}
          reports={reports as never}
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
