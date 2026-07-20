"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PostEditor } from "@/components/posts/post-editor"
import { PostStatsCards } from "@/components/posts/post-stats-cards"
import type { MediaItem } from "@/components/media/media-thumb"
import type { ButtonRows } from "@/lib/tg/buttons"
import { cancelSchedule, deletePost } from "@/app/actions/tg-posts"
import { deleteTemplate } from "@/app/actions/tg-templates"

type Channel = {
  id: number
  title: string
  chatId: string
  type: string
  purpose: string
  botIsAdmin: boolean
  status: string
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
}

const BADGE_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-warning/15 text-warning border-warning/30",
  queued: "bg-primary/15 text-primary border-primary/30",
  sent: "bg-success/15 text-success border-success/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
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
        BADGE_STYLES[status] ?? "bg-muted text-muted-foreground border-border",
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
  botName,
  cdnReady,
}: {
  channels: Channel[]
  posts: Post[]
  schedules: Schedule[]
  stats: Stats
  media: MediaItem[]
  templates: Template[]
  botName: string
  cdnReady: boolean
}) {
  const router = useRouter()
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
    }
  }

  function editPost(post: Post) {
    setPrefill(null)
    setEditing(post)
    setTab("new")
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    setEditing(null)
    setPrefill({
      id: undefined,
      title: tpl.name,
      text: tpl.text ?? undefined,
      parseMode: (tpl.parseMode as "HTML" | "Markdown") ?? "HTML",
      media: resolvedMedia,
      buttons,
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
        {/* 
          Abas com scroll horizontal no mobile.
          Cada aba mostra apenas o ícone no mobile e texto+ícone no sm+.
        */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-hide -mx-0">
          <TabsList className="flex h-auto p-1 bg-slate-900/50 border border-white/5 rounded-xl w-max min-w-full">
            <TabsTrigger value="new" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center">
              <Megaphone className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Nova postagem</span>
              <span className="xs:hidden sm:hidden">Nova</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center">
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Agendadas</span>
              <span className="sm:hidden">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center">
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
            <TabsTrigger value="drafts" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Rascunhos</span>
              <span className="sm:hidden">Rasc.</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center">
              <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Templates</span>
              <span className="sm:hidden">Templ.</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg py-2 px-3 text-[10px] font-bold gap-1.5 whitespace-nowrap flex-1 flex items-center justify-center">
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
              onDelete={onDeletePost}
            />
          </TabsContent>

          <TabsContent value="drafts" className="w-full">
            <PostList
              posts={drafts}
              statusLabels={STATUS_LABELS}
              emptyLabel="Nenhum rascunho salvo."
              onEdit={editPost}
              onDelete={onDeletePost}
            />
          </TabsContent>

          <TabsContent value="templates" className="w-full">
            <TemplateList templates={templates} onUse={useTemplate} />
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
  onUse,
}: {
  templates: Template[]
  onUse: (tpl: Template) => void
}) {
  const router = useRouter()

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
      <Card className="p-6 text-center bg-slate-900/40 border-white/5 rounded-2xl">
        <LayoutTemplate className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-medium">Nenhum template salvo ainda.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Ao montar uma postagem, use "Salvar como template" para reaproveitar depois.</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {templates.map((t) => (
        <Card key={t.id} className="flex flex-col gap-3 p-4 bg-slate-900/40 border-white/5 rounded-2xl shadow-xl w-full">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-white text-sm">{t.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mt-0.5">
                {t.category}
              </p>
            </div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 min-h-[60px]">
            <p className="line-clamp-3 text-xs text-muted-foreground leading-relaxed italic">
              {t.text?.replace(/<[^>]+>/g, "") || "Sem texto"}
            </p>
          </div>
          <div className="mt-auto flex items-center gap-2 pt-1">
            <Button size="sm" className="flex-1 h-9 bg-primary text-black font-black uppercase text-xs rounded-xl" onClick={() => onUse(t)}>
              <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Usar
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              onClick={() => onDelete(t.id)}
              aria-label="Excluir template"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
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
  const active = schedules.filter((s) => s.active)
  if (active.length === 0) {
    return (
      <Card className="p-6 text-center bg-slate-900/40 border-white/5 rounded-2xl">
        <CalendarClock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-medium">Nenhum agendamento ativo.</p>
      </Card>
    )
  }
  return (
    <div className="grid gap-3 w-full">
      {active.map((s) => {
        let recurrenceLabel = "Uma vez"
        try {
          const r = JSON.parse(s.recurrence ?? "{}")
          if (r.kind && r.kind !== "once") recurrenceLabel = "Recorrente"
        } catch { /* ignore */ }
        return (
          <Card
            key={s.id}
            className="flex flex-col gap-3 p-4 bg-slate-900/40 border-white/5 rounded-2xl shadow-xl w-full"
          >
            <div className="min-w-0">
              <p className="truncate font-black text-white text-sm">
                {s.postTitle ?? `Postagem #${s.postId}`}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Próximo envio: <span className="text-blue-400">{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString("pt-BR") : "—"}</span>
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/5">
                  {recurrenceLabel}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 rounded-xl border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 font-bold text-xs uppercase"
              onClick={() => onCancel(s.id)}
            >
              <Ban className="w-3.5 h-3.5 mr-1.5" /> Cancelar agendamento
            </Button>
          </Card>
        )
      })}
    </div>
  )
}

function PostList({
  posts,
  statusLabels,
  emptyLabel,
  onEdit,
  onDelete,
}: {
  posts: Post[]
  statusLabels: Record<string, string>
  emptyLabel: string
  onEdit?: (post: Post) => void
  onDelete: (id: number) => void
}) {
  if (posts.length === 0) {
    return (
      <Card className="p-6 text-center bg-slate-900/40 border-white/5 rounded-2xl">
        <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-medium">{emptyLabel}</p>
      </Card>
    )
  }
  return (
    <div className="grid gap-3 w-full">
      {posts.map((p) => (
        <Card
          key={p.id}
          className="flex flex-col gap-2 p-4 bg-slate-900/40 border-white/5 rounded-2xl shadow-xl w-full"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-white text-sm">
                {p.title ?? `Postagem #${p.id}`}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {p.sentAt
                  ? new Date(p.sentAt).toLocaleString("pt-BR")
                  : new Date(p.updatedAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <PostBadge status={p.status}>
              {statusLabels[p.status] ?? p.status}
            </PostBadge>
          </div>
          {p.text && (
            <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
              {p.text.replace(/<[^>]+>/g, "")}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 rounded-xl border-white/10 hover:bg-white/10 font-bold text-xs uppercase"
                onClick={() => onEdit(p)}
              >
                <Pencil className="w-3 h-3 mr-1.5" /> Editar
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-xl border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              onClick={() => onDelete(p.id)}
              aria-label="Excluir postagem"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
