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
  createCategoryFull,
  updateCategoryFull,
  type CategoryInput,
} from "@/app/actions/categories"
import { toast } from "sonner"

export type CategoryRow = {
  id: number
  name: string
  emoji: string | null
  description: string | null
  imageUrl: string | null
  position: number
  status: string
}

/**
 * Shell that owns only the Dialog frame (no form state). The stateful form is
 * mounted only while open and keyed by category id, so switching between
 * categories always produces a fresh, isolated form — never leaking values
 * from a previously edited record.
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  category?: CategoryRow | null
}) {
  const isEdit = Boolean(category)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            Categorias organizam o catálogo exibido no bot do Telegram.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CategoryForm
            key={category?.id ?? "new"}
            category={category ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function initialForm(category: CategoryRow | null): CategoryInput {
  return {
    name: category?.name ?? "",
    emoji: category?.emoji ?? "",
    description: category?.description ?? "",
    imageUrl: category?.imageUrl ?? "",
    status: (category?.status as "active" | "inactive") ?? "active",
  }
}

function CategoryForm({
  category,
  onClose,
}: {
  category: CategoryRow | null
  onClose: () => void
}) {
  const isEdit = Boolean(category)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<CategoryInput>(() => initialForm(category))

  function set<K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit() {
    if (!form.name?.trim()) {
      toast.error("Informe o nome da categoria")
      return
    }
    startTransition(async () => {
      try {
        if (isEdit && category) {
          await updateCategoryFull(category.id, form)
          toast.success("Categoria atualizada")
        } else {
          await createCategoryFull(form)
          toast.success("Categoria criada")
        }
        onClose()
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-[80px_1fr] gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-emoji">Ícone</Label>
            <Input
              id="cat-emoji"
              value={form.emoji ?? ""}
              onChange={(e) => set("emoji", e.target.value)}
              placeholder="📺"
              maxLength={4}
              className="text-center text-lg"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Nome</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Netflix"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cat-description">Descrição (opcional)</Label>
          <Textarea
            id="cat-description"
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Texto exibido ao abrir a categoria no bot."
            rows={2}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cat-image">URL da imagem (opcional)</Label>
          <Input
            id="cat-image"
            value={form.imageUrl ?? ""}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select
            items={{ active: "Ativa", inactive: "Inativa" }}
            value={form.status}
            onValueChange={(v) => set("status", v as "active" | "inactive")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar categoria"}
        </Button>
      </DialogFooter>
    </>
  )
}
