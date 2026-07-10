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
import { createProduct, updateProduct, type ProductInput } from "@/app/actions/products"
import { toast } from "sonner"

type Category = { id: number; name: string }

type ProductRow = {
  id: number
  name: string
  description: string | null
  categoryId: number | null
  imageUrl: string | null
  price: string
  status: string
  deliveryType: string
  lowStockThreshold: number
}

export function ProductDialog({
  open,
  onOpenChange,
  categories,
  product,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: Category[]
  product?: ProductRow | null
}) {
  const isEdit = Boolean(product)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? null,
    imageUrl: product?.imageUrl ?? "",
    price: product ? Number(product.price) : 0,
    status: (product?.status as "active" | "inactive") ?? "active",
    deliveryType: (product?.deliveryType as "stock" | "manual") ?? "stock",
    lowStockThreshold: product?.lowStockThreshold ?? 5,
  })

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Informe o nome do produto")
      return
    }
    startTransition(async () => {
      try {
        if (isEdit && product) {
          await updateProduct(product.id, form)
          toast.success("Produto atualizado")
        } else {
          await createProduct(form)
          toast.success("Produto criado")
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
          <DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            Preencha as informações do produto digital.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Netflix Premium"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Detalhes do produto, garantia, etc."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                items={{
                  none: "Sem categoria",
                  ...Object.fromEntries(
                    categories.map((c) => [String(c.id), c.name]),
                  ),
                }}
                value={form.categoryId ? String(form.categoryId) : "none"}
                onValueChange={(v) =>
                  set("categoryId", v === "none" ? null : Number(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo de entrega</Label>
              <Select
                items={{ stock: "Estoque automático", manual: "Manual" }}
                value={form.deliveryType}
                onValueChange={(v) => set("deliveryType", v as "stock" | "manual")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Estoque automático</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                items={{ active: "Ativo", inactive: "Inativo" }}
                value={form.status}
                onValueChange={(v) => set("status", v as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="threshold">Alerta de estoque baixo</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => set("lowStockThreshold", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">URL da imagem</Label>
              <Input
                id="image"
                value={form.imageUrl ?? ""}
                onChange={(e) => set("imageUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
