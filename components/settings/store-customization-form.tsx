"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveStoreCustomization } from "@/app/actions/settings"
import { toast } from "sonner"

export function StoreCustomizationForm({
  initial,
}: {
  initial: { welcomeMessage: string; welcomeImageUrl: string }
}) {
  const [welcomeMessage, setWelcomeMessage] = useState(initial.welcomeMessage)
  const [welcomeImageUrl, setWelcomeImageUrl] = useState(
    initial.welcomeImageUrl,
  )
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
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="welcome-message">Mensagem de boas-vindas</Label>
        <Textarea
          id="welcome-message"
          rows={4}
          placeholder="Olá {nome}! 👋 Seja bem-vindo(a) à nossa loja. Confira nossos produtos abaixo:"
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Exibida quando o cliente inicia o bot com /start. Use{" "}
          <code className="rounded bg-muted px-1">{"{nome}"}</code> para inserir o
          nome do cliente. Aceita tags HTML do Telegram (ex.:{" "}
          <code className="rounded bg-muted px-1">{"<b>texto</b>"}</code>).
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="welcome-image">URL da imagem de boas-vindas</Label>
        <Input
          id="welcome-image"
          placeholder="https://... (opcional)"
          value={welcomeImageUrl}
          onChange={(e) => setWelcomeImageUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Opcional. Se informada, a imagem é enviada junto com a mensagem de
          boas-vindas (banner, logo, etc.).
        </p>
      </div>

      {welcomeImageUrl.trim() ? (
        <div className="overflow-hidden rounded-md border">
          {/* Preview of the banner as it will appear in Telegram. */}
          <Image
            src={welcomeImageUrl.trim() || "/placeholder.svg"}
            alt="Prévia da imagem de boas-vindas"
            width={480}
            height={240}
            className="h-auto w-full object-cover"
            unoptimized
          />
        </div>
      ) : null}

      <div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Salvando..." : "Salvar personalização"}
        </Button>
      </div>
    </div>
  )
}
