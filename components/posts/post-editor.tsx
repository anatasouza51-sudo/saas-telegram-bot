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
  LayoutTemplate,
  ChevronDown,
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
import { saveTemplate } from "@/app/actions/tg-templates"
import { cn } from "@/lib/utils"

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
  onDone,
}: {
  channels: Channel[]
  botName: string
  cdnReady: boolean
  onDone?: () => void
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

  function handleSaveTemplate() {
    const name = window.prompt(
      "Nome do template:",
      title || "Novo template",
    )
    if (!name) return
    startTransition(async () => {
      try {
        await saveTemplate({
          name,
          text,
          parseMode,
          mediaIds: media.map((m) => m.id),
          buttons,
        })
        toast.success("Template salvo")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar template")
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
        if (onDone) onDone()
        else router.refresh()
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
        setScheduleOpen(false)
        if (onDone) onDone()
        else router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao agendar")
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* Editor column */}
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-6 p-5 sm:p-8 bg-slate-900/40 border-white/5 rounded-2xl shadow-2xl">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="post-title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título interno (opcional)</Label>
            <Input
              id="post-title"
              placeholder="Ex.: Promoção de fim de semana"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 bg-white/5 border-white/10 rounded-xl px-4 text-base focus:border-primary/40 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between ml-1">
              <Label htmlFor="post-text" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mensagem</Label>
              <Select
                value={parseMode}
                onValueChange={(v) => setParseMode((v as "HTML" | "Markdown") ?? "HTML")}
              >
                <SelectTrigger size="sm" className="w-32 h-8 bg-white/5 border-white/10 rounded-lg text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="Markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Toolbar de formatação - Botões Maiores */}
            <div className="flex flex-wrap gap-2 p-1 bg-black/20 rounded-xl w-fit">
              <Button type="button" variant="ghost" size="icon" onClick={formatBold} className="h-10 w-10 hover:bg-white/10 rounded-lg" aria-label="Negrito">
                <Bold className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={formatItalic} className="h-10 w-10 hover:bg-white/10 rounded-lg" aria-label="Itálico">
                <Italic className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={formatCode} className="h-10 w-10 hover:bg-white/10 rounded-lg" aria-label="Código">
                <Code className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={formatLink} className="h-10 w-10 hover:bg-white/10 rounded-lg" aria-label="Link">
                <Link2 className="h-5 w-5" />
              </Button>
            </div>

            <Textarea
              id="post-text"
              ref={textareaRef}
              rows={10}
              placeholder="Escreva sua mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-white/5 border-white/10 rounded-2xl p-4 text-base focus:border-primary/40 focus:ring-primary/10 transition-all leading-relaxed min-h-[200px]"
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">
              {text.length} caracteres · Formatação {parseMode}
            </p>
          </div>

          {/* Media - Grid de miniaturas maiores */}
          <div className="flex flex-col gap-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mídia</Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="relative aspect-square overflow-hidden rounded-xl border border-white/10 group"
                >
                  <img
                    src={`/api/tg/media/${m.id}`}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((x) => x.id !== m.id))}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-red-500 transition-colors"
                    aria-label="Remover mídia"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="aspect-square flex-col gap-2 p-0 bg-white/5 border-white/10 border-dashed hover:bg-primary/10 hover:border-primary/30 rounded-xl"
                onClick={() => setPickerOpen(true)}
              >
                <ImagePlus className="h-6 w-6 text-primary/60" />
                <span className="text-[9px] font-black uppercase tracking-widest">Adicionar</span>
              </Button>
            </div>
          </div>

          {/* Buttons - Redesenhado */}
          <div className="flex flex-col gap-3 pt-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Botões inline</Label>
            <ButtonBuilder rows={buttons} onChange={setButtons} />
          </div>
        </Card>

        {/* Actions - Mobile Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={handlePublish} disabled={isPending} className="h-14 bg-primary text-black font-black uppercase text-sm rounded-2xl shadow-xl shadow-primary/10">
            <Send className="mr-2 h-5 w-5" />
            Publicar agora
          </Button>
          <Button
            variant="outline"
            onClick={() => setScheduleOpen((s) => !s)}
            disabled={isPending}
            className="h-14 bg-white/5 border-white/10 text-white font-black uppercase text-sm rounded-2xl"
          >
            <CalendarClock className="mr-2 h-5 w-5" />
            Agendar
          </Button>
          <Button variant="ghost" onClick={handleSaveDraft} disabled={isPending} className="h-12 text-muted-foreground hover:text-white font-bold uppercase text-xs">
            <Save className="mr-2 h-4 w-4" />
            Salvar rascunho
          </Button>
          <Button
            variant="ghost"
            onClick={handleSaveTemplate}
            disabled={isPending}
            className="h-12 text-muted-foreground hover:text-white font-bold uppercase text-xs"
          >
            <LayoutTemplate className="mr-2 h-4 w-4" />
            Salvar como template
          </Button>
        </div>

        {scheduleOpen && (
          <Card className="flex flex-col gap-6 p-6 bg-slate-900/60 border-primary/20 rounded-2xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              <Label className="text-sm font-black uppercase tracking-widest">Configurar Agendamento</Label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="run-at" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Data e hora de envio
                </Label>
                <Input
                  id="run-at"
                  type="datetime-local"
                  value={runAt}
                  onChange={(e) => setRunAt(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 rounded-xl px-4"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Frequência</Label>
                <Select
                  value={recurrence}
                  onValueChange={(v) =>
                    setRecurrence((v as Recurrence["kind"]) ?? "once")
                  }
                >
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl px-4">
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
            <Button onClick={handleSchedule} disabled={isPending} className="w-full h-12 bg-primary text-black font-black uppercase text-xs rounded-xl">
              Confirmar Agendamento
            </Button>
          </Card>
        )}
      </div>

      {/* Sidebar - Preview & Targets */}
      <div className="flex flex-col gap-6">
        {/* Targets */}
        <Card className="flex flex-col gap-4 p-6 bg-slate-900/40 border-white/5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destinos da Mensagem</Label>
            <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-full">{targets.size} selecionados</span>
          </div>
          {audience.length === 0 ? (
            <p className="text-sm text-muted-foreground italic bg-white/5 p-4 rounded-xl border border-dashed border-white/10">
              Nenhum grupo/canal de audiência configurado.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.length > 0 && (
                <TargetGroup
                  icon={<Users className="h-4 w-4" />}
                  label="Grupos de Audiência"
                  items={groups}
                  targets={targets}
                  onToggle={toggleTarget}
                />
              )}
              {chans.length > 0 && (
                <TargetGroup
                  icon={<Megaphone className="h-4 w-4" />}
                  label="Canais de Transmissão"
                  items={chans}
                  targets={targets}
                  onToggle={toggleTarget}
                />
              )}
            </div>
          )}
        </Card>

        {/* Preview - Apenas no Desktop ou Tablet */}
        <div className="hidden md:block">
          <PostPreview
            botName={botName}
            text={text}
            parseMode={parseMode}
            media={media}
            buttons={buttons}
          />
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(items) => {
          setMedia((prev) => {
            const existing = new Set(prev.map((m) => m.id))
            const added = items.filter((m) => !existing.has(m.id))
            return [...prev, ...added]
          })
          setPickerOpen(false)
        }}
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
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
        {icon}
        {label}
      </div>
      <div className="grid gap-2">
        {items.map((item) => {
          const active = targets.has(item.chatId)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.chatId)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98]",
                active
                  ? "border-primary/40 bg-primary/10 text-primary shadow-lg shadow-primary/5"
                  : "border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{item.title}</p>
                <p className="truncate text-[10px] opacity-60 font-medium">@{item.chatId}</p>
              </div>
              <div className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                active ? "border-primary bg-primary text-black" : "border-white/20"
              )}>
                {active && <Send className="w-3 h-3" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
