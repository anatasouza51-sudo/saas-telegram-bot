"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  saveAutomation,
  toggleAutomation,
  deleteAutomation,
} from "@/app/actions/tg-automations"
import {
  Zap,
  Plus,
  Trash2,
  Pencil,
  PackagePlus,
  PackageCheck,
  PackageX,
  Tag,
} from "lucide-react"

type Automation = {
  id: number
  name: string
  trigger: string
  templateId: number | null
  customText: string | null
  targets: string
  active: boolean
  lastTriggeredAt: string | Date | null
}

type Channel = {
  id: number
  title: string
  chatId: string
  type: string
  purpose: string
}

type Template = { id: number; name: string }

const TRIGGERS: Record<
  string,
  { label: string; icon: typeof Zap; hint: string }
> = {
  product_created: {
    label: "Novo produto cadastrado",
    icon: PackagePlus,
    hint: "Dispara quando um produto ativo é criado.",
  },
  stock_restocked: {
    label: "Estoque reposto",
    icon: PackageCheck,
    hint: "Dispara quando um produto sem estoque volta a ter itens.",
  },
  product_unavailable: {
    label: "Produto indisponível",
    icon: PackageX,
    hint: "Dispara quando um produto é desativado.",
  },
  promo_created: {
    label: "Promoção criada",
    icon: Tag,
    hint: "Dispare manualmente ou por integração de promoções.",
  },
}

const VARIABLES = ["{product}", "{price}", "{category}", "{stock}"]

export function AutomationsView({
  automations,
  channels,
  templates,
}: {
  automations: Automation[]
  channels: Channel[]
  templates: Template[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Automation | null>(null)

  function openNew() {
    setEditing(null)
    setOpen(true)
  }
  function openEdit(a: Automation) {
    setEditing(a)
    setOpen(true)
  }

  async function onToggle(a: Automation) {
    try {
      await toggleAutomation(a.id, !a.active)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro")
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteAutomation(id)
      toast.success("Automação excluída")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="size-4" /> Nova automação
        </Button>
      </div>

      {automations.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Zap className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhuma automação ainda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crie regras para publicar automaticamente quando eventos da loja
            acontecerem.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {automations.map((a) => {
            const t = TRIGGERS[a.trigger]
            const Icon = t?.icon ?? Zap
            return (
              <Card key={a.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t?.label ?? a.trigger}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={a.active}
                    onCheckedChange={() => onToggle(a)}
                    aria-label="Ativar automação"
                  />
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {a.customText?.replace(/<[^>]+>/g, "") ||
                    (a.templateId ? "Usa um template" : "Sem conteúdo")}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil className="size-4" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onDelete(a.id)}
                    aria-label="Excluir automação"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <AutomationDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        channels={channels}
        templates={templates}
        onSaved={() => {
          setOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function AutomationDialog({
  open,
  onOpenChange,
  editing,
  channels,
  templates,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Automation | null
  channels: Channel[]
  templates: Template[]
  onSaved: () => void
}) {
  const [name, setName] = useState(editing?.name ?? "")
  const [trigger, setTrigger] = useState(editing?.trigger ?? "product_created")
  const [mode, setMode] = useState<"text" | "template">(
    editing?.templateId ? "template" : "text",
  )
  const [templateId, setTemplateId] = useState<string>(
    editing?.templateId ? String(editing.templateId) : "",
  )
  const [customText, setCustomText] = useState(editing?.customText ?? "")
  const [targets, setTargets] = useState<string[]>(() => {
    try {
      return JSON.parse(editing?.targets ?? "[]")
    } catch {
      return []
    }
  })
  const [pending, startTransition] = useTransition()

  function toggleTarget(value: string) {
    setTargets((prev) =>
      prev.includes(value)
        ? prev.filter((t) => t !== value)
        : [...prev, value],
    )
  }

  function submit() {
    startTransition(async () => {
      try {
        await saveAutomation(
          {
            name,
            trigger,
            templateId: mode === "template" ? Number(templateId) || null : null,
            customText: mode === "text" ? customText : undefined,
            targets,
            active: editing?.active ?? true,
          },
          editing?.id,
        )
        toast.success(editing ? "Automação atualizada" : "Automação criada")
        onSaved()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar automação" : "Nova automação"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="auto-name">Nome</Label>
            <Input
              id="auto-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Anunciar novos produtos"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Gatilho</Label>
            <Select value={trigger} onValueChange={(v) => setTrigger(v as string)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGERS).map(([key, t]) => (
                  <SelectItem key={key} value={key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {TRIGGERS[trigger]?.hint}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Conteúdo</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("text")}
              >
                Texto
              </Button>
              <Button
                type="button"
                variant={mode === "template" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("template")}
                disabled={templates.length === 0}
              >
                Template
              </Button>
            </div>
            {mode === "text" ? (
              <>
                <Textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Ex: Novo produto disponível: {product} por R$ {price}!"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {VARIABLES.join(", ")}
                </p>
              </>
            ) : (
              <Select
                value={templateId}
                onValueChange={(v) => setTemplateId((v as string) ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Destinos</Label>
            <div className="flex flex-wrap gap-2">
              <TargetChip
                label="Todos os grupos"
                active={targets.includes("all_groups")}
                onClick={() => toggleTarget("all_groups")}
              />
              <TargetChip
                label="Todos os canais"
                active={targets.includes("all_channels")}
                onClick={() => toggleTarget("all_channels")}
              />
            </div>
            <div className="flex flex-col gap-1 rounded-md border border-border p-2">
              {channels.filter((c) => c.purpose === "audience").length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">
                  Nenhum grupo/canal cadastrado. Adicione em Grupos & Canais.
                </p>
              ) : (
                channels
                  .filter((c) => c.purpose === "audience")
                  .map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={targets.includes(c.chatId)}
                        onChange={() => toggleTarget(c.chatId)}
                        className="size-4 accent-primary"
                      />
                      <span className="truncate">{c.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {c.type === "channel" ? "Canal" : "Grupo"}
                      </span>
                    </label>
                  ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TargetChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
      }
    >
      {label}
    </button>
  )
}
