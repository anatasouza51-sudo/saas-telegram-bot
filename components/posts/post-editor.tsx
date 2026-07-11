"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Bold,
  Italic,
  Code,
  Link2,
  ImagePlus,
  Send,
  CalendarClock,
  Save,
  X,
  Users,
  Megaphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ButtonBuilder } from "@/components/posts/button-builder"
import { PostPreview } from "@/components/posts/post-preview"
import { MediaPicker } from "@/components/posts/media-picker"
import type { MediaItem } from "@/components/media/media-thumb"
import type { ButtonRows } from "@/lib/tg/buttons"
import type { Recurrence } from "@/lib/tg/recurrence"
import { publishNow, savePost, schedulePost } from "@/app/actions/tg-posts"

type Channel = {
  id: number
  title: string
  chatId: string
  type: string
  purpose: string
  botIsAdmin: boolean
  status: string
}

const RECURRENCE_OPTIONS: { value: Recurrence["kind"]; label: string }[] = [
  { value: "once", label: "Uma vez" },
  { value: "daily", label: "Todo dia" },
  { value: "weekly", label: "Toda semana" },
  { value: "monthly", label: "Todo mês" },
  { value: "interval", label: "A cada X" },
]

export function PostEditor({
  channels,
  botName,
  cdnReady,
  initial,
}: {
  channels: Channel[]
  botName: string
  cdnReady: boolean
  initial?: {
    id?: number
    title?: string
    text?: string
    parseMode?: "HTML" | "Markdown"
    media?: MediaItem[]
    buttons?: ButtonRows
  }
}) {
  const router = useRouter()
  const [postId, setPostId] = useState<number | undefined>(initial?.id)
  const [title, setTitle] = useState(initial?.title ?? "")
  const [text, setText] = useState(initial?.text ?? "")
  const [parseMode, setParseMode] = useState<"HTML" | "Markdown">(
    initial?.parseMode ?? "HTML",
  )
  const [media, setMedia] = useState<MediaItem[]>(initial?.media ?? [])
  const [buttons, setButtons] = useState<ButtonRows>(initial?.buttons ?? [])
  const [targets, setTargets] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [runAt, setRunAt] = useState("")
  const [recurrence, setRecurrence] = useState<Recurrence["kind"]>("once")
  const [intervalEvery, setIntervalEvery] = useState(1)
  const [intervalUnit, setIntervalUnit] =
    useState<"minutes" | "hours" | "days">("hours")
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const audience = useMemo(
    () => channels.filter((c) => c.purpose === "audience"),
    [channels],
  )
  const groups = audience.filter((c) => c.type !== "channel")
  const chans = audience.filter((c) => c.type === "channel")

  function wrapSelection(before: string, after = before) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = text.slice(start, end) || "texto"
    const next = text.slice(0, start) + before + selected + after + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = start + before.length
      el.selectionEnd = start + before.length + selected.length
    })
  }

  function formatBold() {
    wrapSelection(parseMode === "HTML" ? "<b>" : "*", parseMode === "HTML" ? "</b>" : "*")
  }
  function formatItalic() {
    wrapSelection(parseMode === "HTML" ? "<i>" : "_", parseMode === "HTML" ? "</i>" : "_")
  }
  function formatCode() {
    wrapSelection(parseMode === "HTML" ? "<code>" : "`", parseMode === "HTML" ? "</code>" : "`")
  }
  function formatLink() {
    const url = window.prompt("URL do link:")
    if (!url) return
    if (parseMode === "HTML") wrapSelection(`<a href="${url}">`, "</a>")
    else wrapSelection("[", `](${url})`)
  }

  function toggleTarget(id: string) {
    setTargets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function buildInput() {
    return {
      id: postId,
      title,
      text,
      parseMode,
      mediaIds: media.map((m) => m.id),
      buttons,
    }
  }

  function resolveTargetSpec(): string[] {
    return Array.from(targets)
  }

  function handleSaveDraft() {
    startTransition(async () => {
      try {
        const id = await savePost(buildInput())
        setPostId(id)
        toast.success("Rascunho salvo")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  function handlePublish() {
    const spec = resolveTargetSpec()
    if (spec.length === 0) {
      toast.error("Selecione ao menos um destino.")
      return
    }
    startTransition(async () => {
      try {
        const { enqueued } = await publishNow(buildInput(), spec)
        toast.success(`Postagem enfileirada para ${enqueued} destino(s)`)
        router.push("/posts")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao publicar")
      }
    })
  }

  function handleSchedule() {
    const spec = resolveTargetSpec()
    if (spec.length === 0) {
      toast.error("Selecione ao menos um destino.")
      return
    }
    if (!runAt) {
      toast.error("Escolha a data e hora.")
      return
    }
    const rec: Recurrence =
      recurrence === "interval"
        ? { kind: "interval", unit: intervalUnit, every: intervalEvery }
        : { kind: recurrence }

    startTransition(async () => {
      try {
        await schedulePost(buildInput(), spec, {
          runAt: new Date(runAt).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          recurrence: rec,
        })
        toast.success("Postagem agendada")
        router.push("/posts")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao agendar")
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Editor column */}
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-title">Título interno (opcional)</Label>
            <Input
              id="post-title"
              placeholder="Ex.: Promoção de fim de semana"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-text">Mensagem</Label>
              <Select
                value={parseMode}
                onValueChange={(v) => setParseMode((v as "HTML" | "Markdown") ?? "HTML")}
              >
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="Markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button type="button" variant="outline" size="icon-sm" onClick={formatBold} aria-label="Negrito">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" onClick={formatItalic} aria-label="Itálico">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" onClick={formatCode} aria-label="Código">
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" onClick={formatLink} aria-label="Link">
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              id="post-text"
              ref={textareaRef}
              rows={8}
              placeholder="Escreva sua mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {text.length} caracteres · Formatação {parseMode}
            </p>
          </div>

          {/* Media */}
          <div className="flex flex-col gap-2">
            <Label>Mídia</Label>
            <div className="flex flex-wrap items-center gap-2">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="relative h-16 w-16 overflow-hidden rounded-md border border-border"
                >
                  <img
                    src={`/api/tg/media/${m.id}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((x) => x.id !== m.id))}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background/80 text-foreground"
                    aria-label="Remover mídia"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-16 w-16 flex-col gap-1 p-0"
                onClick={() => setPickerOpen(true)}
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px]">Mídia</span>
              </Button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <Label>Botões inline</Label>
            <ButtonBuilder rows={buttons} onChange={setButtons} />
          </div>
        </Card>

        {/* Targets */}
        <Card className="flex flex-col gap-3 p-4">
          <Label>Destinos</Label>
          {audience.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum grupo/canal de audiência. Adicione em Grupos & Canais.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {groups.length > 0 && (
                <TargetGroup
                  icon={<Users className="h-4 w-4" />}
                  label="Grupos"
                  items={groups}
                  targets={targets}
                  onToggle={toggleTarget}
                />
              )}
              {chans.length > 0 && (
                <TargetGroup
                  icon={<Megaphone className="h-4 w-4" />}
                  label="Canais"
                  items={chans}
                  targets={targets}
                  onToggle={toggleTarget}
                />
              )}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePublish} disabled={isPending}>
            <Send className="mr-2 h-4 w-4" />
            Publicar agora
          </Button>
          <Button
            variant="outline"
            onClick={() => setScheduleOpen((s) => !s)}
            disabled={isPending}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Agendar
          </Button>
          <Button variant="ghost" onClick={handleSaveDraft} disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            Salvar rascunho
          </Button>
        </div>

        {scheduleOpen && (
          <Card className="flex flex-col gap-4 p-4">
            <Label>Agendamento</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="run-at" className="text-xs text-muted-foreground">
                  Data e hora
                </Label>
                <Input
                  id="run-at"
                  type="datetime-local"
                  value={runAt}
                  onChange={(e) => setRunAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Repetição</Label>
                <Select
                  value={recurrence}
                  onValueChange={(v) =>
                    setRecurrence((v as Recurrence["kind"]) ?? "once")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {recurrence === "interval" && (
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">A cada</Label>
                  <Input
                    type="number"
                    min={1}
                    className="w-24"
                    value={intervalEvery}
                    onChange={(e) => setIntervalEvery(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <Select
                  value={intervalUnit}
                  onValueChange={(v) =>
                    setIntervalUnit((v as "minutes" | "hours" | "days") ?? "hours")
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSchedule} disabled={isPending} className="self-start">
              <CalendarClock className="mr-2 h-4 w-4" />
              Confirmar agendamento
            </Button>
          </Card>
        )}
      </div>

      {/* Preview column */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Label className="mb-2 block">Pré-visualização</Label>
        <PostPreview
          text={text}
          parseMode={parseMode}
          media={media}
          buttons={buttons}
          botName={botName}
        />
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedIds={media.map((m) => m.id)}
        onConfirm={setMedia}
        cdnReady={cdnReady}
      />
    </div>
  )
}

function TargetGroup({
  icon,
  label,
  items,
  targets,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  items: Channel[]
  targets: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => {
          const active = targets.has(c.chatId)
          const disabled = !c.botIsAdmin || c.status !== "active"
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(c.chatId)}
              className={
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors " +
                (disabled
                  ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60"
                  : active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary")
              }
              title={disabled ? "Bot não é admin ou canal inativo" : c.title}
            >
              {c.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}
