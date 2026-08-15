"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
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

type PressState = {
  category: Row
  pointerId: number
  sourceIndex: number
  startX: number
  startY: number
  originRect: DOMRect
  timer: ReturnType<typeof setTimeout>
}

type DragState = {
  category: Row
  pointerId: number
  sourceIndex: number
  dropIndex: number | null
  originRect: DOMRect
  grabOffsetX: number
  grabOffsetY: number
  lastX: number
  lastY: number
}

export function CategoriesView({ categories }: { categories: Row[] }) {
  // Local order enables instant, optimistic reordering while the server
  // persists sequential positions. Re-seeded whenever server data changes.
  const [order, setOrder] = useState<Row[]>(categories)
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<{ open: boolean; category?: Row | null }>({
    open: false,
  })
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [dragPreview, setDragPreview] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const pressRef = useRef<PressState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)

  useEffect(() => {
    setOrder(categories)
  }, [categories])

  const action = useCallback((fn: () => Promise<unknown>, successMsg: string) => {
    startTransition(async () => {
      try {
        await fn()
        toast.success(successMsg)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }, [startTransition])

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

  function beginPress(event: React.PointerEvent<HTMLDivElement>, category: Row) {
    if (event.pointerType === "mouse" || pending || typeof window === "undefined") return
    if (!window.matchMedia("(max-width: 639px)").matches) return

    const target = event.target as HTMLElement
    if (target.closest("button, [role=menuitem], input, textarea, select, a")) return

    const sourceIndex = order.findIndex((item) => item.id === category.id)
    const row = rowRefs.current[category.id]
    if (sourceIndex < 0 || !row) return

    if (pressRef.current) window.clearTimeout(pressRef.current.timer)

    const press: PressState = {
      category,
      pointerId: event.pointerId,
      sourceIndex,
      startX: event.clientX,
      startY: event.clientY,
      originRect: row.getBoundingClientRect(),
      timer: setTimeout(() => {
        const current = pressRef.current
        if (!current || current.pointerId !== event.pointerId) return

        dragRef.current = {
          category: current.category,
          pointerId: current.pointerId,
          sourceIndex: current.sourceIndex,
          dropIndex: current.sourceIndex,
          originRect: current.originRect,
          grabOffsetX: current.startX - current.originRect.left,
          grabOffsetY: current.startY - current.originRect.top,
          lastX: current.startX,
          lastY: current.startY,
        }
        pressRef.current = null
        row.setPointerCapture?.(event.pointerId)
        setDraggingId(category.id)
        setDropIndex(current.sourceIndex)
        setDragPreview({
          left: current.originRect.left,
          top: current.originRect.top,
          width: current.originRect.width,
          height: current.originRect.height,
        })
      }, 240),
    }

    pressRef.current = press
  }

  useEffect(() => {
    function cancelPendingPress(pointerId?: number) {
      const press = pressRef.current
      if (!press || (pointerId !== undefined && press.pointerId !== pointerId)) return
      window.clearTimeout(press.timer)
      pressRef.current = null
    }

    function stopAutoScroll() {
      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current)
        autoScrollFrameRef.current = null
      }
    }

    function getEdgeScrollStep(clientY: number) {
      const edgeSize = Math.min(120, Math.max(72, window.innerHeight * 0.12))
      const maxStep = 5
      const minStep = 1.25

      if (clientY <= edgeSize) {
        const intensity = Math.min(1, (edgeSize - clientY) / edgeSize)
        return -Math.max(minStep, intensity * maxStep)
      }

      const bottomEdge = window.innerHeight - edgeSize
      if (clientY >= bottomEdge) {
        const intensity = Math.min(1, (clientY - bottomEdge) / edgeSize)
        return Math.max(minStep, intensity * maxStep)
      }

      return 0
    }

    function updateDragPosition(clientX: number, clientY: number) {
      const drag = dragRef.current
      const list = listRef.current
      const draggedRow = drag ? rowRefs.current[drag.category.id] : null
      if (!drag || !list || !draggedRow) return

      const bounds = list.getBoundingClientRect()
      setDragPreview((current) =>
        current
          ? {
              ...current,
              left: clientX - drag.grabOffsetX,
              top: clientY - drag.grabOffsetY,
            }
          : current,
      )

      const insideList =
        clientX >= bounds.left &&
        clientX <= bounds.right &&
        clientY >= bounds.top &&
        clientY <= bounds.bottom
      const withinListWidth = clientX >= bounds.left && clientX <= bounds.right
      const edgeSize = Math.min(120, Math.max(72, window.innerHeight * 0.12))
      const nearTopEdge = withinListWidth && clientY <= edgeSize && clientY < bounds.top
      const nearBottomEdge =
        withinListWidth &&
        clientY >= window.innerHeight - edgeSize &&
        clientY > bounds.bottom

      if (!insideList && !nearTopEdge && !nearBottomEdge) {
        drag.dropIndex = null
        setDropIndex(null)
        return
      }

      const targetY = insideList
        ? clientY
        : nearTopEdge
          ? bounds.top + 1
          : bounds.bottom - 1
      const remaining = order.filter((item) => item.id !== drag.category.id)
      let nextIndex = remaining.length

      for (let index = 0; index < remaining.length; index += 1) {
        const row = rowRefs.current[remaining[index].id]
        if (!row) continue
        const rowBounds = row.getBoundingClientRect()
        if (targetY < rowBounds.top + rowBounds.height / 2) {
          nextIndex = index
          break
        }
      }

      drag.dropIndex = nextIndex
      setDropIndex(nextIndex)
    }

    function autoScrollStep() {
      const drag = dragRef.current
      if (!drag) {
        stopAutoScroll()
        return
      }

      const step = getEdgeScrollStep(drag.lastY)
      if (step === 0) {
        stopAutoScroll()
        return
      }

      const scrollTarget = document.scrollingElement ?? document.documentElement
      const maxScrollTop = Math.max(0, scrollTarget.scrollHeight - window.innerHeight)
      const before = scrollTarget.scrollTop
      const nextScrollTop = Math.min(maxScrollTop, Math.max(0, before + step))
      scrollTarget.scrollTop = nextScrollTop
      const after = scrollTarget.scrollTop
      if (after === before) {
        stopAutoScroll()
        return
      }

      updateDragPosition(drag.lastX, drag.lastY)
      autoScrollFrameRef.current = window.requestAnimationFrame(autoScrollStep)
    }

    function scheduleAutoScroll() {
      if (autoScrollFrameRef.current === null) {
        autoScrollFrameRef.current = window.requestAnimationFrame(autoScrollStep)
      }
    }

    function handlePointerMove(event: PointerEvent) {
      const press = pressRef.current
      const drag = dragRef.current

      if (press && !drag && event.pointerId === press.pointerId) {
        const movedX = event.clientX - press.startX
        const movedY = event.clientY - press.startY
        if (Math.hypot(movedX, movedY) > 14) cancelPendingPress(event.pointerId)
        return
      }

      if (!drag || event.pointerId !== drag.pointerId) return

      event.preventDefault()
      drag.lastX = event.clientX
      drag.lastY = event.clientY
      updateDragPosition(event.clientX, event.clientY)
      scheduleAutoScroll()
    }

    function finishDrag(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) {
        cancelPendingPress(event.pointerId)
        return
      }
      if (event.pointerId !== drag.pointerId) return

      stopAutoScroll()
      const targetIndex = drag.dropIndex
      const remaining = order.filter((item) => item.id !== drag.category.id)

      if (targetIndex !== null && targetIndex !== drag.sourceIndex) {
        const next = [...remaining]
        next.splice(targetIndex, 0, drag.category)
        setOrder(next)
        action(
          () => reorderCategories(next.map((item) => item.id)),
          "Ordem atualizada",
        )
      }

      dragRef.current = null
      setDraggingId(null)
      setDropIndex(null)
      setDragPreview(null)
    }

    function cancelDrag(event: PointerEvent) {
      cancelPendingPress(event.pointerId)
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      stopAutoScroll()
      dragRef.current = null
      setDraggingId(null)
      setDropIndex(null)
      setDragPreview(null)
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false })
    window.addEventListener("pointerup", finishDrag)
    window.addEventListener("pointercancel", cancelDrag)

    return () => {
      cancelPendingPress()
      stopAutoScroll()
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", finishDrag)
      window.removeEventListener("pointercancel", cancelDrag)
    }
  }, [action, order])


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
          <p className="text-xs text-muted-foreground">
            <span className="sm:hidden">Toque e segure para reordenar</span>
            <span className="hidden sm:inline">Use as setas para alterar a ordem</span>
          </p>
        </div>

        <div ref={listRef} className="divide-y divide-border/70">
          {order.length === 0 && (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <FolderTree className="h-8 w-8 opacity-40" />
              Nenhuma categoria criada.
            </div>
          )}

          {order.map((c) => {
            const originalIndex = order.findIndex((item) => item.id === c.id)
            const remainingIndex = draggingId
              ? order.filter((item) => item.id !== draggingId).findIndex((item) => item.id === c.id)
              : -1
            const isDragging = draggingId === c.id
            return (
              <div key={c.id}>
                {draggingId && c.id !== draggingId && dropIndex === remainingIndex && (
                  <div className="mx-4 h-1 rounded-full bg-primary shadow-[0_0_12px_rgba(169,201,127,0.7)] sm:hidden" aria-hidden="true" />
                )}
                <div
                  ref={(element) => {
                    rowRefs.current[c.id] = element
                  }}
                  className={`flex min-w-0 flex-col gap-4 p-4 transition-[background-color,box-shadow,opacity] duration-150 hover:bg-muted/30 select-none sm:flex-row sm:items-center sm:select-auto ${
                    isDragging
                      ? "relative z-0 touch-none opacity-0 sm:relative sm:z-auto sm:opacity-100"
                      : "touch-pan-y"
                  }`}
                  onPointerDown={(event) => beginPress(event, c)}
                  aria-grabbed={isDragging}
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
                    <div className="hidden items-center gap-1 sm:flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={originalIndex === 0 || pending}
                        onClick={() => move(originalIndex, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                        <span className="sr-only">Mover {c.name} para cima</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={originalIndex === order.length - 1 || pending}
                        onClick={() => move(originalIndex, 1)}
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
              </div>
            )
          })}

          {draggingId && dropIndex === order.filter((item) => item.id !== draggingId).length && (
            <div className="mx-4 h-1 rounded-full bg-primary shadow-[0_0_12px_rgba(169,201,127,0.7)] sm:hidden" aria-hidden="true" />
          )}
        </div>
      </div>

      {dragPreview && draggingId !== null && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-[70] flex max-w-[calc(100vw-2rem)] flex-col gap-4 rounded-xl border border-primary/30 bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.32)] backdrop-blur-sm sm:hidden"
          style={{
            width: dragPreview.width,
            minHeight: dragPreview.height,
            transform: `translate3d(${dragPreview.left}px, ${dragPreview.top}px, 0)`,
          }}
          aria-hidden="true"
        >
          {(() => {
            const draggedCategory = order.find((item) => item.id === draggingId)
            if (!draggedCategory) return null
            return (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg leading-none">
                    {draggedCategory.emoji || "📁"}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-medium">{draggedCategory.name}</p>
                    {draggedCategory.description && (
                      <p className="break-words text-xs text-muted-foreground line-clamp-2">
                        {draggedCategory.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-12 flex-col items-end">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Produtos</span>
                    <span className="text-sm font-medium text-muted-foreground">{draggedCategory.productCount}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      draggedCategory.status === "active"
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-muted-foreground/30 bg-muted text-muted-foreground"
                    }
                  >
                    {draggedCategory.status === "active" ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </>
            )
          })()}
        </div>
      )}

      <CategoryFormDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))}
        category={dialog.category}
      />
    </div>
  )
}
