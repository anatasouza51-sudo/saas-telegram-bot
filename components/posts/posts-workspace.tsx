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
  scheduled: "bg-warning/15 text-warning border-warning/30",
  queued: "bg-primary/15 text-primary border-primary/30",
  sent: "bg-success/15 text-success border-success/30",
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
    <div className="flex flex-col gap-4 w-full max-w-full overflow-hidden">
      <Tabs value={tab} onValueChange={(v) => setTab((v as string) ?? "new")} className="w-full flex flex-col">
        {/* Abas com scroll horizontal no mobile */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
          <TabsList className="flex h-auto p-1 bg-dashboard-bg/50 border border-dashboard-border/30 rounded-xl w-max min-w-full">
            <TabsTrigger value="new" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center text-dashboard-text-muted data-[state=active]:text-dashboard-text data-[state=active]:bg-dashboard-surface-elevated">
              <Megaphone className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Nova postagem</span>
              <span className="sm:hidden">Nova</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center text-dashboard-text-muted data-[state=active]:text-dashboard-text data-[state=active]:bg-dashboard-surface-elevated">
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Agendadas</span>
              <span className="sm:hidden">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center text-dashboard-text-muted data-[state=active]:text-dashboard-text data-[state=active]:bg-dashboard-surface-elevated">
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center text-dashboard-text-muted data-[state=active]:text-dashboard-text data-[state=active]:bg-dashboard-surface-elevated">
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Relatórios</span>
              <span className="sm:hidden">Relat.</span>
            </TabsTrigger>
            <TabsTrigger value="drafts" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center text-dashboard-text-muted data-[state=active]:text-dashboard-text data-[state=active]:bg-dashboard-surface-elevated">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Rascunhos</span>
              <span className="sm:hidden">Rasc.</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center text-dashboard-text-muted data-[state=active]:text-dashboard-text data-[state=active]:bg-dashboard-surface-elevated">
              <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Templates</span>
              <span className="sm:hidden">Templ.</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center text-dashboard-text-muted data-[state=active]:text-dashboard-text data-[state=active]:bg-dashboard-surface-elevated">
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Estatísticas</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-3 w-full">
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
        <Card key={t.id} className="flex flex-col gap-3 p-4 bg-dashboard-card border-dashboard-border/30 rounded-2xl shadow-xl w-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-black text-dashboard-text truncate">{t.name}</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t.category}</span>
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
          <div className="bg-dashboard-bg/50 rounded-xl p-2.5 border border-dashboard-border/20">
            <p className="text-[10px] text-dashboard-text-muted line-clamp-3 leading-relaxed">
              {t.text || "(Sem texto)"}
            </p>
          </div>
          <TemplateTargets tokens={parseTargets(t.defaultTargets)} labelFor={targetLabels} />
          <Button 
            onClick={() => onUse(t)}
            className="w-full mt-1 bg-dashboard-bg/50 border border-dashboard-border/30 hover:bg-dashboard-bg/80 text-dashboard-text text-[10px] font-black uppercase h-8 rounded-lg"
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
        <Card key={s.id} className="flex flex-col gap-3 p-4 bg-dashboard-card border-dashboard-border/30 rounded-2xl shadow-xl w-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-black text-dashboard-text truncate">
                {s.postTitle || `Postagem #${s.postId}`}
              </span>
              <span className="text-[10px] font-bold text-warning uppercase tracking-widest">
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
            className="w-full mt-1 border border-destructive/20 hover:bg-destructive/5 text-destructive text-[10px] font-black uppercase h-8 rounded-lg"
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
        <Card key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-dashboard-card border-dashboard-border/30 rounded-2xl shadow-xl w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-xl bg-dashboard-bg/50 flex items-center justify-center border border-dashboard-border/20 shrink-0">
              <Megaphone className="h-5 w-5 text-dashboard-text-muted" />
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
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
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
