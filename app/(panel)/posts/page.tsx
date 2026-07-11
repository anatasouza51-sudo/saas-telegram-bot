import { PageHeader } from "@/components/page-header"
import { PostsWorkspace } from "@/components/posts/posts-workspace"
import { listChannels } from "@/app/actions/tg-channels"
import { listPosts, listSchedules, getPostStats } from "@/app/actions/tg-posts"
import { listMedia } from "@/app/actions/tg-media"
import { listTemplates } from "@/app/actions/tg-templates"
import { getStoreTelegram } from "@/lib/tg/config"
import { requireCapability } from "@/lib/session"

export default async function PostsPage() {
  const user = await requireCapability("posts.manage")
  const tg = await getStoreTelegram(user.storeId)

  const [channels, posts, schedules, stats, media, templates] =
    await Promise.all([
      listChannels(),
      listPosts("all"),
      listSchedules(),
      getPostStats(),
      listMedia(),
      listTemplates(),
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
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Postagens"
        description="Crie mensagens com mídia e botões, agende disparos e acompanhe o histórico."
      />
      <PostsWorkspace
        channels={channels as never}
        posts={posts as never}
        schedules={schedules as never}
        stats={stats as never}
        media={media as never}
        templates={templates as never}
        botName={botName}
        cdnReady={Boolean(tg.client && tg.cdnChatId)}
      />
    </div>
  )
}
