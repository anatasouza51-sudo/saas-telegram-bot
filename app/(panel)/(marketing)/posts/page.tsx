import { PostsWorkspace } from "@/components/posts/posts-workspace"
import { listChannels } from "@/app/actions/tg-channels"
import { listPosts, listSchedules, getPostStats, getPostReports } from "@/app/actions/tg-posts"
import { listMedia } from "@/app/actions/tg-media"
import { listTemplates } from "@/app/actions/tg-templates"
import { getStoreTelegram } from "@/lib/tg/config"
import { requireCapability } from "@/lib/session"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export const maxDuration = 60 // 60 seconds

type Channel = {
  id: number
  title: string
  chatId: string
  type: string
  purpose: string
  botIsAdmin: boolean
  status: string
  isForum?: boolean
}

type Topic = {
  id: number
  chatId: string
  threadId: number
  name: string
}

type Post = {
  id: number
  title: string | null
  text: string | null
  parseMode: string
  mediaIds: string | null
  buttons: string | null
  status: string
  createdByName: string | null
  sentAt: string | null
  updatedAt: string
}

type Schedule = {
  id: number
  postId: number
  scheduleType: string
  runAt: string | null
  nextRunAt: string | null
  recurrence: string | null
  active: boolean
  targets: string
  createdByName: string | null
  postTitle: string | null
}

type Stats = {
  total: number
  sent: number
  failed: number
  scheduled: number
  draft: number
  today: number
  week: number
  month: number
}

type Template = {
  id: number
  name: string
  category: string
  text: string | null
  parseMode: string
  mediaIds: string | null
  buttons: string | null
  defaultTargets: string | null
}

type PostReportItem = {
  postId: number
  title: string | null
  status: string
  sentAt: string | null
  queue: Array<{
    id: number
    postId: number
    chatId: string
    status: string
    attempts: number
    lastError: string | null
    sentMessageId: number | null
    scheduledFor: string
    createdAt: string
    updatedAt: string
  }>
}

type MediaItem = {
  id: number
  ownerId: string
  folderId: number | null
  fileId: string
  fileUniqueId: string | null
  type: string
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  width: number | null
  height: number | null
  duration: number | null
  thumbFileId: string | null
  caption: string | null
  uploadedBy: string | null
  uploadedByName: string | null
  usageCount: number
  createdAt: string | Date
}

const EMPTY_STATS: Stats = {
  total: 0, sent: 0, failed: 0, scheduled: 0, draft: 0, today: 0, week: 0, month: 0
}

async function safeLoad<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[PostsPage] "${label}" failed:`, err)
    return fallback
  }
}

export default async function PostsPage() {
  // Auth runs outside the try: `requireCapability` redirects unauthenticated
  // users via a control-flow exception that must never be caught here.
  let user
  try {
    user = await requireCapability("posts.manage")
  } catch (e) {
    // If it's a redirect (e.g. no session), re-throw so Next.js handles it.
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e
    // Any other error (DB timeout, etc.) — show a friendly error page instead
    // of crashing the Server Component render.
    console.error("[PostsPage] Auth failed:", e)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-destructive animate-spin-slow" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            Sessão Indisponível
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Não foi possível verificar sua sessão. Isso pode ocorrer se o banco de dados estiver temporariamente indisponível.
          </p>
        </div>
        <div className="flex flex-col w-full gap-3">
          <a href="/posts" className="w-full">
            <Button className="w-full bg-white text-black hover:bg-white/90 font-bold rounded-xl h-12">
              Tentar Novamente
            </Button>
          </a>
        </div>
      </div>
    )
  }

  // Load Telegram config — if this fails, we still render the page but
  // without bot-specific features (no bot name in preview, no CDN).
  let tg: Awaited<ReturnType<typeof getStoreTelegram>> | null = null
  try {
    tg = await getStoreTelegram(user.storeId)
  } catch (err) {
    console.error("[PostsPage] getStoreTelegram failed:", err)
  }

  // All 7 loaders run in parallel, each wrapped in safeLoad to guarantee
  // a fallback even if the DB pool is exhausted or a query times out.
  const [channels, posts, schedules, stats, media, templates, reports] = await Promise.all([
    safeLoad<Channel[]>("listChannels", () => listChannels() as Promise<Channel[]>, []),
    safeLoad<Post[]>("listPosts", () => listPosts("all") as unknown as Promise<Post[]>, []),
    safeLoad<Schedule[]>("listSchedules", () => listSchedules() as Promise<Schedule[]>, []),
    safeLoad<Stats>("getPostStats", () => getPostStats() as Promise<Stats>, EMPTY_STATS),
    safeLoad<MediaItem[]>("listMedia", () => listMedia() as Promise<MediaItem[]>, []),
    safeLoad<Template[]>("listTemplates", () => listTemplates() as Promise<Template[]>, []),
    safeLoad<PostReportItem[]>("getPostReports", () => getPostReports() as unknown as Promise<PostReportItem[]>, []),
  ])

  // Resolve the bot's display name for the live preview (best-effort).
  let botName = "Seu Bot"
  let cdnReady = false
  if (tg?.client) {
    try {
      const me = await tg.client.getMe()
      if (me?.ok && me?.result) {
        botName = me.result.first_name || me.result.username || botName
      }
    } catch (meError) {
      console.error("[PostsPage] getMe failed:", meError)
    }
    cdnReady = Boolean(tg.cdnChatId)
  }

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-hidden">
      <PostsWorkspace
        channels={channels}
        topics={[]}
        posts={posts}
        schedules={schedules}
        stats={stats}
        media={media}
        templates={templates}
        reports={reports}
        botName={botName}
        cdnReady={cdnReady}
      />
    </div>
  )
}
