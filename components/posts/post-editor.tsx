"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Bold,
  Italic,
  Code,
  Link2,
  Send,
  CalendarClock,
  Save,
  X,
  Users,
  Megaphone,
  LayoutTemplate,
  MessagesSquare,
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
import { MediaAttachment } from "@/components/posts/media-picker"
import { MediaThumb, type MediaItem } from "@/components/media/media-thumb"
import type { ButtonRows } from "@/lib/tg/buttons"
import type { Recurrence } from "@/lib/tg/recurrence"
import { publishNow, savePost, schedulePost } from "@/app/actions/tg-posts"
import { saveTemplate } from "@/app/actions/tg-templates"
import { cn } from "@/lib/utils"
import { validateSafeUrl } from "@/lib/html-safety"

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
    targets?: string[]
  }
}) {
  const router = useRouter()
  const [postId, setPostId] = useState<number | undefined>(initial?.id)
  const [title, setTitle] = useState(initial?.title ?? "")
  const [text, setText] = useState(initial?.text ?? "")
  // 5 000 char cap on the message editor: scripts pasted with hundreds of
  // thousands of chars would otherwise be silently sent downstream and can
  // break Telegram (4096 limit) or bloat the DB. Server validation enforces
  // the same cap (validateTelegramText / sanitizeTelegramHtml).
  const MAX_TEXT_LENGTH = 5_000
  const [parseMode, setParseMode] = useState<"HTML" | "Markdown">(
    initial?.parseMode ?? "HTML",
  )
  const [media, setMedia] = useState<MediaItem[]>(initial?.media ?? [])
  const [buttons, setButtons] = useState<ButtonRows>(initial?.buttons ?? [])
  const [targets, setTargets] = useState<Set<string>>(
    () => new Set(initial?.targets ?? []),
  )
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
    const rawUrl = window.prompt("URL do link:")
    if (!rawUrl) return

    try {
      const url = validateSafeUrl(rawUrl, "URL do link")
      if (!url) return
      if (parseMode === "HTML") wrapSelection(`<a href="${url}">`, "</a>")
      else wrapSelection("[", `](${url})`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "URL do link inválida.")
    }
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
          defaultTargets: Array.from(targets),
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
        const { enqueued, sent, failed } = await publishNow(buildInput(), spec)
        
        // Success feedback
        if (failed > 0) {
          toast.error(
            `${sent} enviado(s), ${failed} falhou(aram) de ${enqueued} destino(s).`,
          )
        } else {
          toast.success("enviado a mensagem ao Telegram destino da mensagem")
        }

        // IMPORTANT: Clear the post state after successful publish to prevent 
        // accidental duplicate sends if the user clicks again before the 
        // navigation/refresh completes.
        setPostId(undefined)
        setTitle("")
        setText("")
        setMedia([])
        setButtons([])
        setTargets(new Set())

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
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashboard-border/30 bg-dashboard-surface/70 px-4 py-3 shadow-lg shadow-black/5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dashboard-accent/15 text-dashboard-accent">
            <Megaphone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-dashboard-text">
              {postId ? "Editar postagem" : "Nova postagem"}
            </p>
            <p className="truncate text-[10px] font-medium text-dashboard-text-muted">
              Monte a mensagem e escolha os destinos de envio.
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full border border-dashboard-border/30 bg-dashboard-bg/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-dashboard-text-muted sm:inline-flex">
          {parseMode}
        </span>
      </div>

      {/* Editor principal */}
      <Card className="flex w-full flex-col gap-5 overflow-hidden rounded-2xl border-dashboard-border/30 bg-dashboard-card p-4 shadow-2xl shadow-black/10 sm:p-5 md:p-6">
        <div className="flex items-center justify-between border-b border-dashboard-border/20 pb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dashboard-accent">
              Conteúdo da mensagem
            </p>
            <p className="mt-1 text-xs text-dashboard-text-muted">
              O conteúdo será enviado aos destinos selecionados.
            </p>
          </div>
          <MessagesSquare className="hidden h-5 w-5 text-dashboard-text-muted/50 sm:block" />
        </div>

        {/* Título */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="post-title" className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-text-muted">
            Título interno (opcional)
          </Label>
          <Input
            id="post-title"
            placeholder="Ex.: Promoção de fim de semana"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 rounded-xl border-dashboard-border/30 bg-dashboard-bg/50 px-3 text-sm text-dashboard-text transition-all placeholder:text-dashboard-text-muted/50 focus:border-dashboard-accent/50 focus:ring-dashboard-accent/10"
          />
        </div>

        {/* Mensagem */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="post-text" className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-text-muted">
              Mensagem
            </Label>
            <Select
              value={parseMode}
              onValueChange={(v) => setParseMode((v as "HTML" | "Markdown") ?? "HTML")}
            >
              <SelectTrigger size="sm" className="h-8 w-32 rounded-lg border-dashboard-border/30 bg-dashboard-bg/50 text-xs font-bold text-dashboard-text">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HTML">HTML</SelectItem>
                <SelectItem value="Markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toolbar de formatação */}
          <div className="flex w-fit gap-1 rounded-xl border border-dashboard-border/20 bg-dashboard-bg/50 p-1">
            <Button type="button" variant="ghost" size="icon" onClick={formatBold} className="h-8 w-8 rounded-lg text-dashboard-text hover:bg-dashboard-accent/10 hover:text-dashboard-accent" aria-label="Negrito">
              <Bold className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={formatItalic} className="h-8 w-8 rounded-lg text-dashboard-text hover:bg-dashboard-accent/10 hover:text-dashboard-accent" aria-label="Itálico">
              <Italic className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={formatCode} className="h-8 w-8 rounded-lg text-dashboard-text hover:bg-dashboard-accent/10 hover:text-dashboard-accent" aria-label="Código">
              <Code className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={formatLink} className="h-8 w-8 rounded-lg text-dashboard-text hover:bg-dashboard-accent/10 hover:text-dashboard-accent" aria-label="Link">
              <Link2 className="h-4 w-4" />
            </Button>
          </div>

          <Textarea
            id="post-text"
            ref={textareaRef}
            rows={8}
            placeholder="Escreva sua mensagem..."
            value={text}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
            className="min-h-[190px] resize-none rounded-xl border-dashboard-border/30 bg-dashboard-bg/50 p-4 text-sm leading-relaxed text-dashboard-text transition-all placeholder:text-dashboard-text-muted/50 focus:border-dashboard-accent/50 focus:ring-dashboard-accent/10 sm:min-h-[220px]"
          />
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-dashboard-text-muted/60">
              {text.length} / {MAX_TEXT_LENGTH} caracteres · Formatação{" "}
              {parseMode}
              {text.length >= MAX_TEXT_LENGTH
                ? " · Limite atingido"
                : ""}
            </p>
            <p
              className="text-[10px] text-dashboard-text-muted/60"
              title="Mensagens com mais de 4.096 caracteres são divididas automaticamente em blocos ao enviar."
            >
              Máx. 5.000 caracteres
            </p>
          </div>
        </div>

        {/* Mídia */}
        <div className="flex flex-col gap-3 rounded-2xl border border-dashboard-border/25 bg-dashboard-bg/25 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-text-muted">Mídia</Label>
              <p className="mt-1 text-[10px] text-dashboard-text-muted/60">Anexe imagens, vídeos ou arquivos à postagem.</p>
            </div>
            <span className="rounded-full bg-dashboard-surface/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-dashboard-text-muted">Opcional</span>
          </div>
          <MediaAttachment
            items={media}
            onAdd={(m) => setMedia((prev) => [...prev, m])}
            onRemove={(id) => setMedia((prev) => prev.filter((x) => x.id !== id))}
            cdnReady={cdnReady}
          />
        </div>

        {/* Botões inline */}
        <div className="flex flex-col gap-3 rounded-2xl border border-dashboard-border/25 bg-dashboard-bg/25 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-text-muted">Botões inline</Label>
              <p className="mt-1 text-[10px] text-dashboard-text-muted/60">Crie atalhos para links e ações dentro da mensagem.</p>
            </div>
            <span className="rounded-full bg-dashboard-surface/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-dashboard-text-muted">Telegram</span>
          </div>
          <ButtonBuilder rows={buttons} onChange={setButtons} />
        </div>
      </Card>

      {/* Destinos da Mensagem — aparece em mobile abaixo do editor */}
      <Card className="flex w-full flex-col gap-4 rounded-2xl border-dashboard-border/30 bg-dashboard-card p-4 shadow-xl shadow-black/5 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-dashboard-border/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-dashboard-accent/15 text-dashboard-accent">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-text-muted">Destinos da mensagem</Label>
              <p className="mt-1 text-[10px] text-dashboard-text-muted/60">Escolha quem receberá esta postagem.</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-dashboard-accent/15 px-2.5 py-1 text-[10px] font-black text-dashboard-accent">{targets.size} selecionados</span>
        </div>
        {audience.length === 0 ? (
            <p className="rounded-xl border border-dashed border-dashboard-border/30 bg-dashboard-bg/50 p-4 text-xs italic text-dashboard-text-muted">
            Nenhum grupo/canal de audiência configurado.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.length > 0 && (
              <TargetGroup
                icon={<Users className="h-3.5 w-3.5" />}
                label="Grupos de Audiência"
                items={groups}
                targets={targets}
                onToggle={toggleTarget}
              />
            )}
            {chans.length > 0 && (
              <TargetGroup
                icon={<Megaphone className="h-3.5 w-3.5" />}
                label="Canais de Transmissão"
                items={chans}
                targets={targets}
                onToggle={toggleTarget}
              />
            )}
          </div>
        )}
      </Card>

      {/* Ações — botões proporcionais para mobile */}
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-dashboard-border/30 bg-dashboard-surface/45 p-3 sm:p-4">
        <div className="mb-1 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-text-muted">Finalizar postagem</p>
            <p className="mt-1 text-[10px] text-dashboard-text-muted/60">Publique agora ou defina quando ela será enviada.</p>
          </div>
          <Send className="hidden h-4 w-4 text-dashboard-accent sm:block" />
        </div>
        <Button
          onClick={handlePublish}
          disabled={isPending}
          className="h-12 w-full rounded-xl border border-dashboard-accent/70 bg-dashboard-accent text-dashboard-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_3px_0_rgba(20,36,29,0.75),0_8px_16px_rgba(169,201,127,0.18)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_5px_rgba(20,36,29,0.3),0_1px_0_rgba(20,36,29,0.75)] hover:bg-dashboard-accent/90"
        >
          <Send className="mr-2 h-4 w-4" />
          Publicar agora
        </Button>
        <Button
          variant="outline"
          onClick={() => setScheduleOpen((s) => !s)}
          disabled={isPending}
          className="h-11 w-full rounded-xl border border-dashboard-border/35 bg-dashboard-bg/50 text-xs font-black uppercase text-dashboard-text shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_3px_0_rgba(20,36,29,0.8),0_6px_12px_rgba(0,0,0,0.14)] transition-all active:translate-y-[2px] active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.2),0_1px_0_rgba(20,36,29,0.8)] hover:border-dashboard-accent/40 hover:bg-dashboard-accent/5"
        >
          <CalendarClock className="mr-2 h-4 w-4" />
          Agendar
        </Button>
        <div className="grid grid-cols-2 gap-2 border-t border-dashboard-border/20 pt-2">
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="h-10 rounded-xl border border-dashboard-border/25 bg-dashboard-bg/35 text-[10px] font-bold uppercase text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_0_rgba(20,36,29,0.7),0_4px_8px_rgba(0,0,0,0.12)] transition-all active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.18),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-bg/60 hover:text-dashboard-text"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Salvar rascunho
          </Button>
          <Button
            variant="ghost"
            onClick={handleSaveTemplate}
            disabled={isPending}
            className="h-10 rounded-xl border border-dashboard-border/25 bg-dashboard-bg/35 text-[10px] font-bold uppercase text-dashboard-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_0_rgba(20,36,29,0.7),0_4px_8px_rgba(0,0,0,0.12)] transition-all active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.18),0_1px_0_rgba(20,36,29,0.7)] hover:border-dashboard-accent/30 hover:bg-dashboard-bg/60 hover:text-dashboard-text"
          >
            <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
            Salvar template
          </Button>
        </div>
      </div>

      {/* Agendamento Popover-like (Mobile Friendly) */}
      {scheduleOpen && (
        <Card className="flex flex-col gap-4 rounded-2xl border-dashboard-accent/25 bg-dashboard-card p-4 shadow-2xl shadow-black/10 animate-in fade-in slide-in-from-bottom-4 duration-300 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-accent">Programação de envio</p>
              <h3 className="mt-1 text-sm font-black text-dashboard-text">Configurar agendamento</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setScheduleOpen(false)} className="h-8 w-8 text-dashboard-text-muted">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-dashboard-text-muted">Data e Hora</Label>
              <Input
                type="datetime-local"
                value={runAt}
                onChange={(e) => setRunAt(e.target.value)}
                className="bg-dashboard-bg/50 border-dashboard-border/30 text-dashboard-text rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-dashboard-text-muted">Recorrência</Label>
              <Select
                value={recurrence}
                onValueChange={(v) => setRecurrence(v as Recurrence["kind"])}
              >
                <SelectTrigger className="bg-dashboard-bg/50 border-dashboard-border/30 text-dashboard-text rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {recurrence === "interval" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-dashboard-text-muted">A cada</Label>
                  <Input
                    type="number"
                    min={1}
                    value={intervalEvery}
                    onChange={(e) => setIntervalEvery(parseInt(e.target.value) || 1)}
                    className="bg-dashboard-bg/50 border-dashboard-border/30 text-dashboard-text rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-dashboard-text-muted">Unidade</Label>
                  <Select
                    value={intervalUnit}
                    onValueChange={(v) => setIntervalUnit(v as any)}
                  >
                    <SelectTrigger className="bg-dashboard-bg/50 border-dashboard-border/30 text-dashboard-text rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button
              onClick={handleSchedule}
              disabled={isPending}
              className="w-full bg-dashboard-accent text-white font-black uppercase text-xs rounded-xl h-11"
            >
              Confirmar Agendamento
            </Button>
          </div>
        </Card>
      )}

      {/* Preview flutuante ou abaixo no mobile */}
      <div className="mt-1 rounded-2xl border border-dashboard-border/30 bg-dashboard-surface/45 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-text-muted">
              Prévia no Telegram
            </Label>
            <p className="mt-1 text-[10px] text-dashboard-text-muted/60">Veja como a mensagem aparecerá para o destinatário.</p>
          </div>
          <span className="rounded-full bg-dashboard-bg/50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-dashboard-text-muted">Ao vivo</span>
        </div>
        <PostPreview
          botName={botName}
          text={text}
          parseMode={parseMode}
          media={media}
          buttons={buttons}
        />
      </div>
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
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-dashboard-text-muted/70">
        <span className="text-dashboard-accent">{icon}</span>
        {label}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const active = targets.has(item.chatId)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.chatId)}
              className={cn(
                "flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all",
                active
                  ? "border-dashboard-accent/45 bg-dashboard-accent/10 text-dashboard-text shadow-sm shadow-dashboard-accent/5"
                  : "border-dashboard-border/20 bg-dashboard-bg/30 text-dashboard-text-muted hover:border-dashboard-accent/30 hover:bg-dashboard-bg/50",
              )}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold truncate">{item.title}</span>
                <span className="text-[9px] font-medium opacity-60 truncate">
                  {item.chatId}
                </span>
              </div>
              {active && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dashboard-accent">
                  <CheckIcon className="h-3 w-3 text-dashboard-bg" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
