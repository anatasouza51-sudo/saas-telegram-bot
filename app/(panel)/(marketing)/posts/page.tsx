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
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ""
    
    console.error("[PostsPage] Erro crítico:", errorMessage, errorStack)
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-destructive animate-spin-slow" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            Falha na Conexão com o Banco
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Não conseguimos carregar seus dados. Isso geralmente acontece quando o banco de dados (Neon) atinge o limite de conexões ou está em manutenção.
          </p>
        </div>
        
        {/* Depurador bruto apenas para o dono identificar a causa real no celular */}
        <div className="w-full max-w-md bg-black/40 border border-white/5 rounded-2xl p-4 text-left overflow-hidden">
          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2 opacity-50">Relatório Técnico:</p>
          <p className="text-[11px] font-mono text-destructive/80 break-all leading-relaxed">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col w-full gap-3">
          <a href="/posts" className="w-full">
            <Button className="w-full bg-white text-black hover:bg-white/90 font-bold rounded-xl h-12">
              Tentar Novamente
            </Button>
          </a>
          <p className="text-[10px] text-muted-foreground italic">
            Dica: Verifique se a DATABASE_URL no Vercel está correta.
          </p>
        </div>
      </div>
    )
  }
}
