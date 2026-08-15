"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Megaphone,
  CalendarClock,
  History,
  FileText,
  LayoutTemplate,
  BarChart3,
  Trash2,
  Ban,
  Pencil,
  Wand2,
  Copy,
  ClipboardList,
  MessagesSquare,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PostEditor } from "@/components/posts/post-editor"
import { PostStatsCards } from "@/components/posts/post-stats-cards"
import { PostReport } from "@/components/posts/post-report"
import type { MediaItem } from "@/components/media/media-thumb"
import type { ButtonRows } from "@/lib/tg/buttons"
import { cancelSchedule, deletePost, duplicatePost } from "@/app/actions/tg-posts"
import { deleteTemplate } from "@/app/actions/tg-templates"

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

function parseTargets(json: string | null): string[] {
  try {
    const parsed = JSON.parse(json ?? "[]")
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function TemplateTargets({
  tokens,
  labelFor,
}: {
  tokens: string[]
  labelFor: (token: string) => string
}) {
  if (tokens.length === 0) {
    return (
      <p className="text-[10px] text-dashboard-text-muted/50 italic">
        Sem destino salvo — escolha ao usar.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      <MessagesSquare className="h-3 w-3 text-dashboard-text-muted/60" />
      {tokens.map((token) => (
        <span
          key={token}
          className="rounded-full border border-dashboard-border/30 bg-dashboard-bg/50 px-2 py-0.5 text-[10px] font-bold text-dashboard-text-muted"
        >
          {labelFor(token)}
        </span>
      ))}
    </div>
  )
}

const BADGE_STYLES: Record<string, string> = {
  draft: "bg-dashboard-bg/50 text-dashboard-text-muted border-dashboard-border/30",
  scheduled: "bg-[#C9A95A]/15 text-[#C9A95A] border-[#C9A95A]/30",
  queued: "bg-dashboard-accent/15 text-dashboard-accent border-dashboard-accent/30",
  sent: "bg-[#7CA98D]/15 text-[#7CA98D] border-[#7CA98D]/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-dashboard-bg/50 text-dashboard-text-muted border-dashboard-border/30",
}

function PostBadge({
  status,
  children,
}: {
  status: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        BADGE_STYLES[status] ?? "bg-dashboard-bg/50 text-dashboard-text-muted border-dashboard-border/30",
      )}
    >
      {children}
    </span>
  )
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  queued: "Na fila",
  sent: "Enviada",
  failed: "Falhou",
  cancelled: "Cancelada",
}

export function PostsWorkspace({
  channels,
  posts,
  schedules,
  stats,
  media,
  templates,
  reports,
  botName,
  cdnReady,
}: {
  channels: Channel[]
  posts: Post[]
  schedules: Schedule[]
  stats: Stats
  media: MediaItem[]
  templates: Template[]
  reports: PostReportItem[]
  botName: string
  cdnReady: boolean
}) {
  const router = useRouter()
  const targetLabels = useMemo(() => {
    const chatById = new Map(channels.map((c) => [c.chatId, c.title]))
    return (token: string) => chatById.get(token) ?? token
  }, [channels])
  const [tab, setTab] = useState("new")
  const [editing, setEditing] = useState<Post | null>(null)
  const [prefill, setPrefill] = useState<
    (Omit<ReturnType<typeof parseInitial>, "id"> & { id?: number }) | null
  >(null)

  const drafts = posts.filter((p) => p.status === "draft")
  const history = posts.filter((p) => p.status === "sent" || p.status === "failed")

  function parseInitial(post: Post) {
    let mediaIds: number[] = []
    let buttons: ButtonRows = []
    try {
      mediaIds = JSON.parse(post.mediaIds ?? "[]")
    } catch {
      mediaIds = []
    }
    try {
      buttons = JSON.parse(post.buttons ?? "[]")
    } catch {
      buttons = []
    }
    const byId = new Map(media.map((m) => [m.id, m]))
    const resolvedMedia = mediaIds
      .map((id) => byId.get(id))
      .filter((m): m is MediaItem => Boolean(m))
    return {
      id: post.id,
      title: post.title ?? undefined,
      text: post.text ?? undefined,
      parseMode: (post.parseMode as "HTML" | "Markdown") ?? "HTML",
      media: resolvedMedia,
      buttons,
      targets: [] as string[],
    }
  }

  function editPost(post: Post) {
    setPrefill(null)
    setEditing(post)
    setTab("new")
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onDuplicatePost(post: Post) {
    try {
      const result = await duplicatePost(post.id)
      toast.success(`Postagem duplicada como rascunho #${result.newId}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao duplicar")
    }
  }

  function useTemplate(tpl: Template) {
    let mediaIds: number[] = []
    let buttons: ButtonRows = []
    try {
      mediaIds = JSON.parse(tpl.mediaIds ?? "[]")
    } catch {
      mediaIds = []
    }
    try {
      buttons = JSON.parse(tpl.buttons ?? "[]")
    } catch {
      buttons = []
    }
    const byId = new Map(media.map((m) => [m.id, m]))
    const resolvedMedia = mediaIds
      .map((id) => byId.get(id))
      .filter((m): m is MediaItem => Boolean(m))
    let defaultTargets: string[] = []
    try {
      const parsed = JSON.parse(tpl.defaultTargets ?? "[]")
      if (Array.isArray(parsed)) defaultTargets = parsed.map(String)
    } catch {
      defaultTargets = []
    }
    setEditing(null)
    setPrefill({
      id: undefined,
      title: tpl.name,
      text: tpl.text ?? undefined,
      parseMode: (tpl.parseMode as "HTML" | "Markdown") ?? "HTML",
      media: resolvedMedia,
      buttons,
      targets: defaultTargets,
    })
    setTab("new")
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast.success(`Template "${tpl.name}" carregado`)
  }

  async function onCancelSchedule(id: number) {
    try {
      await cancelSchedule(id)
      toast.success("Agendamento cancelado")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar")
    }
  }

  async function onDeletePost(id: number) {
    try {
      await deletePost(id)
      toast.success("Postagem excluída")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir")
    }
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-5 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-dashboard-border/20 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-dashboard-accent">
            Comunicação da loja
          </p>
          <h1 className="text-xl font-black tracking-tight text-dashboard-text sm:text-2xl">
            Postagens
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-dashboard-text-muted">
            Crie, agende e acompanhe mensagens enviadas para seus grupos e canais.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-dashboard-border/30 bg-dashboard-surface/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-dashboard-text-muted">
          <Megaphone className="h-3.5 w-3.5 text-dashboard-accent" />
          <span>{posts.length} registros</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab((v as string) ?? "new")} className="flex w-full flex-col">
        <div className="w-full rounded-2xl border border-dashboard-border/30 bg-dashboard-surface/70 p-3 shadow-lg shadow-black/5 sm:p-2">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dashboard-text-muted">
              Área de trabalho
            </p>
            <span className="hidden text-[10px] font-medium text-dashboard-text-muted/60 sm:inline">
              Selecione uma seção
            </span>
          </div>
          <TabsList className="!h-auto min-h-0 w-full max-w-none auto-rows-fr grid-flow-row grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-4 sm:gap-1 lg:grid-cols-7">
            <TabsTrigger value="new" className="!h-auto min-h-[78px] flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashboard-border/25 bg-dashboard-surface/45 px-1 py-3 text-center text-[10px] font-bold text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_rgba(20,36,29,0.7),0_6px_10px_rgba(0,0,0,0.16)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5 data-[state=active]:border-dashboard-accent/45 data-[state=active]:bg-dashboard-accent/15 data-[state=active]:text-dashboard-text data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_0_rgba(20,36,29,0.75),0_6px_12px_rgba(169,201,127,0.12)] sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-xs">
              <Megaphone className="h-5 w-5 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="whitespace-nowrap text-center leading-tight">Nova postagem</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="!h-auto min-h-[78px] flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashboard-border/25 bg-dashboard-surface/45 px-1 py-3 text-center text-[10px] font-bold text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_rgba(20,36,29,0.7),0_6px_10px_rgba(0,0,0,0.16)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5 data-[state=active]:border-dashboard-accent/45 data-[state=active]:bg-dashboard-accent/15 data-[state=active]:text-dashboard-text data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_0_rgba(20,36,29,0.75),0_6px_12px_rgba(169,201,127,0.12)] sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-xs">
              <CalendarClock className="h-5 w-5 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="whitespace-nowrap text-center leading-tight">Agendadas</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="!h-auto min-h-[78px] flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashboard-border/25 bg-dashboard-surface/45 px-1 py-3 text-center text-[10px] font-bold text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_rgba(20,36,29,0.7),0_6px_10px_rgba(0,0,0,0.16)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5 data-[state=active]:border-dashboard-accent/45 data-[state=active]:bg-dashboard-accent/15 data-[state=active]:text-dashboard-text data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_0_rgba(20,36,29,0.75),0_6px_12px_rgba(169,201,127,0.12)] sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-xs">
              <History className="h-5 w-5 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="whitespace-nowrap text-center leading-tight">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="!h-auto min-h-[78px] flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashboard-border/25 bg-dashboard-surface/45 px-1 py-3 text-center text-[10px] font-bold text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_rgba(20,36,29,0.7),0_6px_10px_rgba(0,0,0,0.16)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5 data-[state=active]:border-dashboard-accent/45 data-[state=active]:bg-dashboard-accent/15 data-[state=active]:text-dashboard-text data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_0_rgba(20,36,29,0.75),0_6px_12px_rgba(169,201,127,0.12)] sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-xs">
              <ClipboardList className="h-5 w-5 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="whitespace-nowrap text-center leading-tight">Relatórios</span>
            </TabsTrigger>
            <TabsTrigger value="drafts" className="!h-auto min-h-[78px] flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashboard-border/25 bg-dashboard-surface/45 px-1 py-3 text-center text-[10px] font-bold text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_rgba(20,36,29,0.7),0_6px_10px_rgba(0,0,0,0.16)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5 data-[state=active]:border-dashboard-accent/45 data-[state=active]:bg-dashboard-accent/15 data-[state=active]:text-dashboard-text data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_0_rgba(20,36,29,0.75),0_6px_12px_rgba(169,201,127,0.12)] sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-xs">
              <FileText className="h-5 w-5 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="whitespace-nowrap text-center leading-tight">Rascunhos</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="!h-auto min-h-[78px] flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashboard-border/25 bg-dashboard-surface/45 px-1 py-3 text-center text-[10px] font-bold text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_rgba(20,36,29,0.7),0_6px_10px_rgba(0,0,0,0.16)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5 data-[state=active]:border-dashboard-accent/45 data-[state=active]:bg-dashboard-accent/15 data-[state=active]:text-dashboard-text data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_0_rgba(20,36,29,0.75),0_6px_12px_rgba(169,201,127,0.12)] sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-xs">
              <LayoutTemplate className="h-5 w-5 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="whitespace-nowrap text-center leading-tight">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="!h-auto min-h-[78px] flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashboard-border/25 bg-dashboard-surface/45 px-1 py-3 text-center text-[10px] font-bold text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_rgba(20,36,29,0.7),0_6px_10px_rgba(0,0,0,0.16)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5 data-[state=active]:border-dashboard-accent/45 data-[state=active]:bg-dashboard-accent/15 data-[state=active]:text-dashboard-text data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_0_rgba(20,36,29,0.75),0_6px_12px_rgba(169,201,127,0.12)] sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2.5 sm:text-xs">
              <BarChart3 className="h-5 w-5 shrink-0 sm:h-3.5 sm:w-3.5" />
              <span className="whitespace-nowrap text-center leading-tight">Estatísticas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 w-full">
          <TabsContent value="new" className="w-full">
            <PostEditor
              key={editing?.id ?? (prefill ? "tpl" : "blank")}
              channels={channels}
              botName={botName}
              cdnReady={cdnReady}
              initial={editing ? parseInitial(editing) : (prefill ?? undefined)}
              onDone={() => {
                setEditing(null)
                setPrefill(null)
                router.refresh()
              }}
            />
          </TabsContent>

          <TabsContent value="scheduled" className="w-full">
            <ScheduleList schedules={schedules} onCancel={onCancelSchedule} />
          </TabsContent>

          <TabsContent value="history" className="w-full">
            <PostList
              posts={history}
              statusLabels={STATUS_LABELS}
              emptyLabel="Nenhuma postagem enviada ainda."
              onEdit={editPost}
              onDuplicate={onDuplicatePost}
              onDelete={onDeletePost}
            />
          </TabsContent>

          <TabsContent value="reports" className="w-full">
            <PostReport reports={reports} />
          </TabsContent>

          <TabsContent value="drafts" className="w-full">
            <PostList
              posts={drafts}
              statusLabels={STATUS_LABELS}
              emptyLabel="Nenhum rascunho salvo."
              onEdit={editPost}
              onDuplicate={onDuplicatePost}
              onDelete={onDeletePost}
            />
          </TabsContent>

          <TabsContent value="templates" className="w-full">
            <TemplateList
              templates={templates}
              channels={channels}
              onUse={useTemplate}
            />
          </TabsContent>

          <TabsContent value="stats" className="w-full">
            <PostStatsCards stats={stats} channelCount={channels.length} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function TemplateList({
  templates,
  channels,
  onUse,
}: {
  templates: Template[]
  channels: Channel[]
  onUse: (tpl: Template) => void
}) {
  const router = useRouter()
  const targetLabels = useMemo(() => {
    const chatById = new Map(channels.map((c) => [c.chatId, c.title]))
    return (token: string) => chatById.get(token) ?? token
  }, [channels])

  async function onDelete(id: number) {
    try {
      await deleteTemplate(id)
      toast.success("Template excluído")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir")
    }
  }

  if (templates.length === 0) {
    return (
      <Card className="p-6 text-center bg-dashboard-card border-dashboard-border/30 rounded-2xl shadow-xl">
        <LayoutTemplate className="w-10 h-10 mx-auto mb-3 text-dashboard-text-muted/20" />
        <p className="text-sm text-dashboard-text-muted font-medium">Nenhum template salvo ainda.</p>
        <p className="text-xs text-dashboard-text-muted/60 mt-1">Ao montar uma postagem, use "Salvar como template" para reaproveitar depois.</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {templates.map((t) => (
        <Card key={t.id} className="flex w-full flex-col gap-3 rounded-2xl border-dashboard-border/30 bg-dashboard-card p-4 shadow-xl shadow-black/5 transition-colors hover:border-dashboard-accent/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-black text-dashboard-text truncate">{t.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-dashboard-accent">{t.category}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onUse(t)} className="h-7 w-7 text-dashboard-text-muted hover:text-dashboard-text">
                <Wand2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)} className="h-7 w-7 text-dashboard-text-muted hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-dashboard-border/20 bg-dashboard-bg/50 p-3">
            <p className="text-[10px] text-dashboard-text-muted line-clamp-3 leading-relaxed">
              {t.text || "(Sem texto)"}
            </p>
          </div>
          <TemplateTargets tokens={parseTargets(t.defaultTargets)} labelFor={targetLabels} />
          <Button 
            onClick={() => onUse(t)}
            className="mt-1 h-9 w-full rounded-xl border border-dashboard-border/30 bg-dashboard-bg/50 text-[10px] font-black uppercase text-dashboard-text hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5"
          >
            Usar Template
          </Button>
        </Card>
      ))}
    </div>
  )
}

function ScheduleList({
  schedules,
  onCancel,
}: {
  schedules: Schedule[]
  onCancel: (id: number) => void
}) {
  if (schedules.length === 0) {
    return (
      <Card className="p-6 text-center bg-dashboard-card border-dashboard-border/30 rounded-2xl shadow-xl">
        <CalendarClock className="w-10 h-10 mx-auto mb-3 text-dashboard-text-muted/20" />
        <p className="text-sm text-dashboard-text-muted font-medium">Nenhum agendamento ativo.</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 w-full">
      {schedules.map((s) => (
        <Card key={s.id} className="flex w-full flex-col gap-3 rounded-2xl border-dashboard-border/30 bg-dashboard-card p-4 shadow-xl shadow-black/5 transition-colors hover:border-[#C9A95A]/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-black text-dashboard-text truncate">
                {s.postTitle || `Postagem #${s.postId}`}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C9A95A]">
                {s.scheduleType === "once" ? "Uma vez" : "Recorrente"}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onCancel(s.id)} className="h-7 w-7 text-dashboard-text-muted hover:text-destructive">
              <Ban className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-col gap-1 text-[10px] text-dashboard-text-muted">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-3 w-3" />
              <span>Próximo envio: {s.nextRunAt ? new Date(s.nextRunAt).toLocaleString('pt-BR') : "N/A"}</span>
            </div>
            {s.recurrence && (
              <div className="flex items-center gap-1.5">
                <History className="h-3 w-3" />
                <span>Recorrência: {s.recurrence}</span>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            onClick={() => onCancel(s.id)}
            className="mt-1 h-9 w-full rounded-xl border border-destructive/20 text-[10px] font-black uppercase text-destructive hover:bg-destructive/5"
          >
            Cancelar Agendamento
          </Button>
        </Card>
      ))}
    </div>
  )
}

function PostList({
  posts,
  statusLabels,
  emptyLabel,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  posts: Post[]
  statusLabels: Record<string, string>
  emptyLabel: string
  onEdit: (p: Post) => void
  onDuplicate: (p: Post) => void
  onDelete: (id: number) => void
}) {
  if (posts.length === 0) {
    return (
      <Card className="p-6 text-center bg-dashboard-card border-dashboard-border/30 rounded-2xl shadow-xl">
        <FileText className="w-10 h-10 mx-auto mb-3 text-dashboard-text-muted/20" />
        <p className="text-sm text-dashboard-text-muted font-medium">{emptyLabel}</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {posts.map((p) => (
        <Card key={p.id} className="flex w-full flex-col items-start justify-between gap-4 rounded-2xl border-dashboard-border/30 bg-dashboard-card p-4 shadow-xl shadow-black/5 transition-colors hover:border-dashboard-accent/25 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashboard-border/20 bg-dashboard-bg/50">
              <Megaphone className="h-5 w-5 text-dashboard-accent" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-dashboard-text truncate">
                  {p.title || `Postagem #${p.id}`}
                </span>
                <PostBadge status={p.status}>{statusLabels[p.status] ?? p.status}</PostBadge>
              </div>
              <span className="text-[10px] text-dashboard-text-muted">
                {p.sentAt ? `Enviado em ${new Date(p.sentAt).toLocaleString('pt-BR')}` : `Atualizado em ${new Date(p.updatedAt).toLocaleString('pt-BR')}`}
              </span>
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2 border-t border-dashboard-border/15 pt-3 sm:w-auto sm:border-t-0 sm:pt-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(p)} className="h-8 w-8 text-dashboard-text-muted hover:text-dashboard-text">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDuplicate(p)} className="h-8 w-8 text-dashboard-text-muted hover:text-dashboard-text">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(p.id)} className="h-8 w-8 text-dashboard-text-muted hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
