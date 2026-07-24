"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, Pencil, Send } from "lucide-react"
import {
  addTopic,
  deleteTopic,
  renameTopic,
  testTopic,
  type TopicRow,
} from "@/app/actions/tg-topics"

/**
 * Manages the forum topics of one supergroup. Telegram has no API to list a
 * forum's topics, so they are either auto-detected from messages or registered
 * here with the numeric message_thread_id (the last number of the topic link,
 * t.me/c/<chat>/<threadId>, or what /id replies inside the topic).
 */
export function TopicsDialog({
  open,
  onOpenChange,
  chatId,
  chatTitle,
  topics,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
  chatTitle: string
  topics: TopicRow[]
  onChanged: () => void | Promise<void>
}) {
  const [threadId, setThreadId] = useState("")
  const [name, setName] = useState("")
  const [pending, startTransition] = useTransition()

  function handleAdd() {
    const parsed = Number(threadId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      toast.error("Informe o ID numérico do tópico.")
      return
    }
    startTransition(async () => {
      try {
        await addTopic({ chatId, threadId: parsed, name })
        setThreadId("")
        setName("")
        toast.success("Tópico cadastrado.")
        await onChanged()
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleRename(topic: TopicRow) {
    const next = window.prompt("Novo nome do tópico:", topic.name)
    if (!next) return
    startTransition(async () => {
      try {
        await renameTopic(topic.id, next)
        toast.success("Tópico renomeado.")
        await onChanged()
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleDelete(topic: TopicRow) {
    startTransition(async () => {
      try {
        await deleteTopic(topic.id)
        toast.success("Tópico removido.")
        await onChanged()
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleTest(topic: TopicRow) {
    startTransition(async () => {
      const res = await testTopic(topic.chatId, topic.threadId)
      if (res.ok) toast.success("Mensagem de teste entregue no tópico.")
      else toast.error(res.error ?? "Falha no teste.")
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tópicos de {chatTitle}</DialogTitle>
          <DialogDescription>
            Escolha para qual tópico as postagens vão. O ID é o último número do
            link do tópico (t.me/c/&lt;grupo&gt;/&lt;id&gt;) — ou envie /id
            dentro do tópico e o bot responde com ele.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum tópico cadastrado ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {topics.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      #{t.threadId} · {t.source === "auto" ? "detectado" : "manual"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={pending}
                      onClick={() => handleTest(t)}
                      aria-label="Testar envio no tópico"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={pending}
                      onClick={() => handleRename(t)}
                      aria-label="Renomear tópico"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={pending}
                      onClick={() => handleDelete(t)}
                      aria-label="Remover tópico"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
            <Label className="text-xs font-medium">Cadastrar tópico</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={threadId}
                onChange={(e) => setThreadId(e.target.value)}
                placeholder="ID (ex.: 27)"
                inputMode="numeric"
                className="sm:w-32"
              />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome (ex.: Promoções)"
              />
              <Button onClick={handleAdd} disabled={pending}>
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
