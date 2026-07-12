"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addChannel,
  updateChannel,
  type ChannelInput,
} from "@/app/actions/tg-channels"
import type { ChannelRow } from "./channels-view"
import { toast } from "sonner"

export function ChannelDialog({
  open,
  onOpenChange,
  channel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  channel?: ChannelRow | null
}) {
  const isEdit = Boolean(channel)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<ChannelInput>({
    title: channel?.title ?? "",
    chatId: channel?.chatId ?? "",
    username: channel?.username ?? "",
    type: (channel?.type as ChannelInput["type"]) ?? "group",
    description: channel?.description ?? "",
    purpose: (channel?.purpose as ChannelInput["purpose"]) ?? "audience",
  })

  function set<K extends keyof ChannelInput>(key: K, value: ChannelInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit() {
    if (!form.chatId.trim()) {
      toast.error("Informe o Chat ID.")
      return
    }
    startTransition(async () => {
      try {
        if (isEdit && channel) {
          await updateChannel(channel.id, form)
          toast.success("Destino atualizado")
        } else {
          await addChannel(form)
          toast.success("Destino cadastrado e validado")
        }
        onOpenChange(false)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar destino" : "Novo destino"}</DialogTitle>
          <DialogDescription>
            Adicione o bot como administrador do grupo/canal antes de validar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="ch-title">Nome</Label>
            <Input
              id="ch-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Canal de Ofertas"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ch-chatid">Chat ID</Label>
              <Input
                id="ch-chatid"
                value={form.chatId}
                onChange={(e) => set("chatId", e.target.value)}
                placeholder="-1001234567890"
                disabled={isEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ch-username">Username</Label>
              <Input
                id="ch-username"
                value={form.username ?? ""}
                onChange={(e) => set("username", e.target.value)}
                placeholder="@meucanal"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                items={{
                  group: "Grupo",
                  supergroup: "Supergrupo",
                  channel: "Canal",
                }}
                value={form.type}
                onValueChange={(v) => set("type", v as ChannelInput["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Grupo</SelectItem>
                  <SelectItem value="supergroup">Supergrupo</SelectItem>
                  <SelectItem value="channel">Canal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Função</Label>
              <Select
                items={{
                  audience: "Audiência",
                  cdn: "CDN Privado",
                  management: "Gerenciamento",
                }}
                value={form.purpose}
                onValueChange={(v) => set("purpose", v as ChannelInput["purpose"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audience">Audiência</SelectItem>
                  <SelectItem value="cdn">CDN Privado</SelectItem>
                  <SelectItem value="management">Gerenciamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ch-desc">Descrição</Label>
            <Textarea
              id="ch-desc"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Observações sobre este destino."
              rows={2}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Ao salvar, o sistema consulta a API do Telegram para confirmar que o
            bot é administrador e possui as permissões necessárias.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending
              ? "Validando..."
              : isEdit
                ? "Salvar alterações"
                : "Cadastrar e validar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
