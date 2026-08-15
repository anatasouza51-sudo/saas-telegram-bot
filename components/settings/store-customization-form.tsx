"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { ImageIcon, Link2, MessageSquareText, Save, Sparkles, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveStoreCustomization } from "@/app/actions/settings"
import { toast } from "sonner"

const iconClass = "h-4 w-4 text-dashboard-accent drop-shadow-[0_0_8px_rgba(169,201,127,0.72)]"

export function StoreCustomizationForm({
  initial,
}: {
  initial: { welcomeMessage: string; welcomeImageUrl: string }
}) {
  const [welcomeMessage, setWelcomeMessage] = useState(initial.welcomeMessage)
  const [welcomeImageUrl, setWelcomeImageUrl] = useState(initial.welcomeImageUrl)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      try {
        await saveStoreCustomization({ welcomeMessage, welcomeImageUrl })
        toast.success("Personalização salva")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  return (
    <div className="min-w-0 flex flex-col gap-6">
      <div className="flex items-start gap-3 border-b border-border/60 pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dashboard-accent/10 ring-1 ring-dashboard-accent/20">
          <Store className={iconClass} />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Identidade da loja</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina a primeira impressão que o cliente terá ao iniciar o bot.
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
        <div className="flex min-w-0 flex-col gap-5 border-t border-dashboard-accent/15 pt-5 lg:border-t-0 lg:border-r lg:pr-6 lg:pt-0">
          <div className="flex items-center gap-2">
            <MessageSquareText className={iconClass} />
            <div>
              <Label htmlFor="welcome-message" className="text-sm font-semibold">Mensagem de boas-vindas</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">Enviada quando o cliente usa o comando /start.</p>
            </div>
          </div>
          <Textarea
            id="welcome-message"
            rows={5}
            placeholder="Olá {nome}! Seja bem-vindo(a) à nossa loja."
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className="min-h-28 resize-y bg-background/70"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Use <code className="rounded bg-muted px-1">{"{nome}"}</code> para inserir o nome do cliente. Tags HTML compatíveis do Telegram, como <code className="rounded bg-muted px-1">{"<b>texto</b>"}</code>, também são aceitas.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-5 border-t border-dashboard-accent/15 pt-5 lg:border-t-0 lg:pl-1 lg:pt-0">
          <div className="flex items-center gap-2">
            <ImageIcon className={iconClass} />
            <div>
              <Label htmlFor="welcome-image" className="text-sm font-semibold">Banner de boas-vindas</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">Logo, banner ou imagem promocional.</p>
            </div>
          </div>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="welcome-image"
              placeholder="https://... (opcional)"
              value={welcomeImageUrl}
              onChange={(e) => setWelcomeImageUrl(e.target.value)}
              className="bg-background/70 pl-9"
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A imagem será enviada junto da mensagem no Telegram. Deixe em branco para usar somente texto.
          </p>
          {welcomeImageUrl.trim() ? (
            <div className="overflow-hidden rounded-xl border border-dashboard-accent/15 bg-background/60 shadow-[0_0_24px_rgba(169,201,127,0.08)]">
              <Image
                src={welcomeImageUrl.trim()}
                alt="Prévia da imagem de boas-vindas"
                width={480}
                height={240}
                className="h-auto max-h-48 w-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-dashboard-accent/15 bg-background/30 px-4 text-center">
              <Sparkles className="mb-2 h-4 w-4 text-dashboard-accent/70" />
              <span className="text-xs text-muted-foreground">A prévia da imagem aparecerá aqui</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-border/60 pt-4">
        <Button onClick={submit} disabled={pending} className="w-full gap-2 sm:w-auto">
          <Save className="h-4 w-4" />
          {pending ? "Salvando..." : "Salvar personalização"}
        </Button>
      </div>
    </div>
  )
}
