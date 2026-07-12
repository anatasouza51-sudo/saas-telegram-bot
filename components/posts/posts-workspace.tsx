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
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
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
    // Resolve stored media ids back to full items for the editor, preserving
    // the saved order.
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
  }

  function useTemplate(tpl: Template) {
    // Templates seed a brand-new post (no post id), reusing text/media/buttons.
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
    <Tabs value={tab} onValueChange={(v) => setTab((v as string) ?? "new")}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="new">
          <Megaphone /> Nova postagem
        </TabsTrigger>
        <TabsTrigger value="scheduled">
          <CalendarClock /> Agendadas
        </TabsTrigger>
        <TabsTrigger value="history">
          <History /> Histórico
        </TabsTrigger>
        <TabsTrigger value="drafts">
          <FileText /> Rascunhos
        </TabsTrigger>
        <TabsTrigger value="templates">
          <LayoutTemplate /> Templates
        </TabsTrigger>
        <TabsTrigger value="stats">
          <BarChart3 /> Estatísticas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="new" className="pt-2">
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

      <TabsContent value="scheduled" className="pt-2">
        <ScheduleList schedules={schedules} onCancel={onCancelSchedule} />
      </TabsContent>

      <TabsContent value="history" className="pt-2">
        <PostList
          posts={history}
          statusLabels={STATUS_LABELS}
          emptyLabel="Nenhuma postagem enviada ainda."
          onDelete={onDeletePost}
        />
      </TabsContent>

      <TabsContent value="drafts" className="pt-2">
        <PostList
          posts={drafts}
          statusLabels={STATUS_LABELS}
          emptyLabel="Nenhum rascunho salvo."
          onEdit={editPost}
          onDelete={onDeletePost}
        />
      </TabsContent>

      <TabsContent value="templates" className="pt-2">
        <TemplateList templates={templates} onUse={useTemplate} />
      </TabsContent>

      <TabsContent value="stats" className="pt-2">
        <PostStatsCards stats={stats} channelCount={channels.length} />
      </TabsContent>
    </Tabs>
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
      <Card className="p-6 text-sm text-muted-foreground">
        Nenhum template salvo ainda. Ao montar uma postagem, use{" "}
        <span className="font-medium text-foreground">Salvar como template</span>{" "}
        para reaproveitar depois.
      </Card>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <Card key={t.id} className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium">{t.name}</p>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t.category}
            </span>
          </div>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {t.text?.replace(/<[^>]+>/g, "") || "Sem texto"}
          </p>
          <div className="mt-auto flex items-center gap-2 pt-2">
            <Button size="sm" className="flex-1" onClick={() => onUse(t)}>
              <Wand2 className="size-4" /> Usar
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onDelete(t.id)}
              aria-label="Excluir template"
            >
              <Trash2 className="size-4" />
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
      <Card className="p-6 text-sm text-muted-foreground">
        Nenhum agendamento ativo.
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {active.map((s) => {
        let recurrenceLabel = "Uma vez"
        try {
          const r = JSON.parse(s.recurrence ?? "{}")
          if (r.kind && r.kind !== "once") recurrenceLabel = "Recorrente"
        } catch {
          /* ignore */
        }
        return (
          <Card
            key={s.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {s.postTitle ?? `Postagem #${s.postId}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Próximo envio:{" "}
                {s.nextRunAt
                  ? new Date(s.nextRunAt).toLocaleString("pt-BR")
                  : "—"}{" "}
                · {recurrenceLabel}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(s.id)}
            >
              <Ban className="size-4" /> Cancelar
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
      <Card className="p-6 text-sm text-muted-foreground">{emptyLabel}</Card>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <Card key={post.id} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">
                {post.title ?? `Postagem #${post.id}`}
              </p>
              <PostBadge status={post.status}>
                {statusLabels[post.status] ?? post.status}
              </PostBadge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {post.text?.replace(/<[^>]+>/g, "") || "Sem texto"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onEdit ? (
              <Button variant="outline" size="sm" onClick={() => onEdit(post)}>
                <Pencil className="size-4" /> Editar
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onDelete(post.id)}
              aria-label="Excluir postagem"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
