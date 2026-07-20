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
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
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
    <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden">
      <Tabs value={tab} onValueChange={(v) => setTab((v as string) ?? "new")} className="w-full flex flex-col">
        {/* 
          TabsList com scroll horizontal e largura flexível. 
          Isso resolve a causa raiz de forçar largura de desktop.
        */}
        <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="flex h-auto p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-max sm:w-full min-w-full">
            <TabsTrigger value="new" className="rounded-xl py-2.5 px-4 text-xs font-bold gap-2 whitespace-nowrap flex-1">
              <Megaphone className="w-4 h-4" /> Nova postagem
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-xl py-2.5 px-4 text-xs font-bold gap-2 whitespace-nowrap flex-1">
              <CalendarClock className="w-4 h-4" /> Agendadas
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl py-2.5 px-4 text-xs font-bold gap-2 whitespace-nowrap flex-1">
              <History className="w-4 h-4" /> Histórico
            </TabsTrigger>
            <TabsTrigger value="drafts" className="rounded-xl py-2.5 px-4 text-xs font-bold gap-2 whitespace-nowrap flex-1">
              <FileText className="w-4 h-4" /> Rascunhos
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-xl py-2.5 px-4 text-xs font-bold gap-2 whitespace-nowrap flex-1">
              <LayoutTemplate className="w-4 h-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl py-2.5 px-4 text-xs font-bold gap-2 whitespace-nowrap flex-1">
              <BarChart3 className="w-4 h-4" /> Estatísticas
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
      <Card className="p-8 text-center bg-slate-900/40 border-white/5 rounded-2xl">
        <LayoutTemplate className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-medium">Nenhum template salvo ainda.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Ao montar uma postagem, use "Salvar como template" para reaproveitar depois.</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {templates.map((t) => (
        <Card key={t.id} className="flex flex-col gap-4 p-5 bg-slate-900/40 border-white/5 rounded-2xl shadow-xl w-full">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-white text-base">{t.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mt-0.5">
                {t.category}
              </p>
            </div>
          </div>
          <div className="bg-black/20 rounded-xl p-3 min-h-[80px]">
            <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed italic">
              {t.text?.replace(/<[^>]+>/g, "") || "Sem texto"}
            </p>
          </div>
          <div className="mt-auto flex items-center gap-2 pt-2">
            <Button size="lg" className="flex-1 h-11 bg-primary text-black font-black uppercase text-xs rounded-xl" onClick={() => onUse(t)}>
              <Wand2 className="w-4 h-4 mr-2" /> Usar
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              onClick={() => onDelete(t.id)}
              aria-label="Excluir template"
            >
              <Trash2 className="w-4 h-4" />
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
      <Card className="p-8 text-center bg-slate-900/40 border-white/5 rounded-2xl">
        <CalendarClock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-medium">Nenhum agendamento ativo.</p>
      </Card>
    )
  }
  return (
    <div className="grid gap-4 w-full">
      {active.map((s) => {
        let recurrenceLabel = "Uma vez"
        try {
          const r = JSON.parse(s.recurrence ?? "{}")
          if (r.kind && r.kind !== "once") recurrenceLabel = "Recorrente"
        } catch { /* ignore */ }
        return (
          <Card
            key={s.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/40 border-white/5 rounded-2xl shadow-xl w-full"
          >
            <div className="min-w-0">
              <p className="truncate font-black text-white text-base">
                {s.postTitle ?? `Postagem #${s.postId}`}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground font-medium">
                  Próximo envio: <span className="text-blue-400">{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString("pt-BR") : "—"}</span>
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/5">
                  {recurrenceLabel}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="h-11 sm:h-10 px-6 rounded-xl border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 font-bold text-xs uppercase"
              onClick={() => onCancel(s.id)}
            >
              <Ban className="w-4 h-4 mr-2" /> Cancelar
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
      <Card className="p-8 text-center bg-slate-900/40 border-white/5 rounded-2xl">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-medium">{emptyLabel}</p>
      </Card>
    )
  }
  return (
    <div className="grid gap-4 w-full">
      {posts.map((post) => (
        <Card key={post.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/40 border-white/5 rounded-2xl shadow-xl w-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <p className="truncate font-black text-white text-base">
                {post.title ?? `Postagem #${post.id}`}
              </p>
              <PostBadge status={post.status}>
                {statusLabels[post.status] ?? post.status}
              </PostBadge>
            </div>
            <div className="bg-black/20 rounded-xl px-3 py-2">
              <p className="line-clamp-2 text-sm text-muted-foreground italic leading-relaxed">
                {post.text?.replace(/<[^>]+>/g, "") || "Sem texto"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            {onEdit ? (
              <Button variant="outline" size="lg" className="flex-1 sm:flex-none h-11 sm:h-10 px-6 rounded-xl border-white/10 hover:bg-primary/10 hover:text-primary font-bold text-xs uppercase" onClick={() => onEdit(post)}>
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              onClick={() => onDelete(post.id)}
              aria-label="Excluir postagem"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
