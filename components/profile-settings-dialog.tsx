"use client"

import { useState, useTransition } from "react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { updateUserProfile } from "@/app/actions/profile"
import { Camera, Loader2 } from "lucide-react"

export function ProfileSettingsDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; name: string; email: string }
}) {
  const [name, setName] = useState(user.name)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Nome não pode estar vazio")
      return
    }

    startTransition(async () => {
      try {
        const result = await updateUserProfile({ name: name.trim() })
        if (result.ok) {
          toast.success("Perfil atualizado com sucesso")
          onOpenChange(false)
        } else {
          toast.error(result.error || "Erro ao atualizar perfil")
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao atualizar perfil")
      }
    })
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurações de Perfil</DialogTitle>
          <DialogDescription>
            Personalize suas informações de perfil
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-white hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Clique na câmera para alterar foto (em breve)
            </p>
          </div>

          {/* Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              disabled={pending}
            />
          </div>

          {/* Email Display */}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Email não pode ser alterado
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
