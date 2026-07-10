"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCategory, deleteCategory } from "@/app/actions/products"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

type Category = { id: number; name: string; description: string | null }

export function CategoryDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: Category[]
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [pending, startTransition] = useTransition()

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Informe o nome da categoria")
      return
    }
    startTransition(async () => {
      try {
        await createCategory(name, description)
        setName("")
        setDescription("")
        toast.success("Categoria criada")
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        await deleteCategory(id)
        toast.success("Categoria excluída")
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
          <DialogDescription>Organize seus produtos por categoria.</DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="cat-name">Nova categoria</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Streaming"
            />
          </div>
          <Button onClick={handleCreate} disabled={pending}>
            Adicionar
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma categoria criada.</p>
          )}
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
            >
              <span className="text-sm">{c.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => handleDelete(c.id)}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
