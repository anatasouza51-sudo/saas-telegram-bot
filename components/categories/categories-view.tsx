"use client"

import { useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CategoryFormDialog, type CategoryRow } from "./category-form-dialog"
import {
  deleteCategoryFull,
  reorderCategories,
  setCategoryStatus,
} from "@/app/actions/categories"
import { toast } from "sonner"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  ArrowUp,
  ArrowDown,
  FolderTree,
  Layers3,
} from "lucide-react"

type Row = CategoryRow & { productCount: number; createdAt: Date }

export function CategoriesView({ categories }: { categories: Row[] }) {
  // Local order enables instant, optimistic reordering while the server
  // persists sequential positions. Re-seeded whenever server data changes.
  const [order, setOrder] = useState<Row[]>(categories)
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<{ open: boolean; category?: Row | null }>({
    open: false,
  })

  useEffect(() => {
    setOrder(categories)
  }, [categories])

  function action(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(successMsg)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
    action(
      () => reorderCategories(next.map((c) => c.id)),
      "Ordem atualizada",
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Categorias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize a navegação do catálogo e defina a ordem exibida no bot.
          </p>
        </div>
        <Button className="w-full shrink-0 sm:w-auto" onClick={() => setDialog({ open: true, category: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] to-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total de categorias</p>
            <Layers3 className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{order.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Organizadas no menu do bot</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Categorias ativas</p>
            <FolderTree className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{order.filter((c) => c.status === "active").length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Disponíveis para os clientes</p>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="flex min-w-0 flex-col gap-1 border-b border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-medium">Categorias do catálogo</h2>
            <p className="text-xs text-muted-foreground">{order.length} categoria(s) cadastrada(s)</p>
          </div>
          <p className="text-xs text-muted-foreground">Use as setas para alterar a ordem</p>
        </div>

        <div className="divide-y divide-border/70">
          {order.length === 0 && (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <FolderTree className="h-8 w-8 opacity-40" />
              Nenhuma categoria criada.
            </div>
          )}

          {order.map((c, i) => (
            <div
              key={c.id}
              className="flex min-w-0 flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg leading-none">
                  {c.emoji || "📁"}
                </span>
                <div className="min-w-0">
                  <p className="break-words font-medium">{c.name}</p>
                  {c.description && (
                    <p className="break-words text-xs text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-xs text-muted-foreground sm:hidden">Ordem</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={i === 0 || pending}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span className="sr-only">Mover {c.name} para cima</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={i === order.length - 1 || pending}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                    <span className="sr-only">Mover {c.name} para baixo</span>
                  </Button>
                </div>

                <div className="flex min-w-12 flex-col items-end sm:items-start">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Produtos</span>
                  <span className="text-sm font-medium text-muted-foreground">{c.productCount}</span>
                </div>

                <Badge
                  variant="outline"
                  className={
                    c.status === "active"
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-muted-foreground/30 bg-muted text-muted-foreground"
                  }
                >
                  {c.status === "active" ? "Ativa" : "Inativa"}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações da categoria {c.name}</span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDialog({ open: true, category: c })}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        action(
                          () =>
                            setCategoryStatus(
                              c.id,
                              c.status === "active" ? "inactive" : "active",
                            ),
                          "Status atualizado",
                        )
                      }
                    >
                      <Power className="mr-2 h-4 w-4" />
                      {c.status === "active" ? "Desativar" : "Ativar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => action(() => deleteCategoryFull(c.id), "Categoria excluída")}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CategoryFormDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))}
        category={dialog.category}
      />
    </div>
  )
}
