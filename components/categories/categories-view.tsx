"use client"

import { useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {order.length} categoria(s). A ordem define como aparecem no bot.
        </p>
        <Button onClick={() => setDialog({ open: true, category: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Ordem</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FolderTree className="h-8 w-8 opacity-40" />
                    Nenhuma categoria criada.
                  </div>
                </TableCell>
              </TableRow>
            )}
            {order.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === 0 || pending}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                      <span className="sr-only">Mover para cima</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === order.length - 1 || pending}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                      <span className="sr-only">Mover para baixo</span>
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{c.emoji || "📁"}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      {c.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {c.description}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.productCount}
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
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
                      <DropdownMenuItem
                        onClick={() => setDialog({ open: true, category: c })}
                      >
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
                        onClick={() =>
                          action(() => deleteCategoryFull(c.id), "Categoria excluída")
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CategoryFormDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))}
        category={dialog.category}
      />
    </div>
  )
}
