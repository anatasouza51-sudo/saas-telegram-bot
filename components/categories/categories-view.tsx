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
  lastX: number
  lastY: number
  startedAt: number
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
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const originalScrollBehaviorRef = useRef<string | null>(null)

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

  function activateDrag(current: PressState) {
    const row = rowRefs.current[current.category.id]
    if (!row) return false

    const currentRect = row.getBoundingClientRect()
    dragRef.current = {
      category: current.category,
      pointerId: current.pointerId,
      sourceIndex: current.sourceIndex,
      dropIndex: current.sourceIndex,
      originRect: currentRect,
      grabOffsetX: current.lastX - currentRect.left,
      grabOffsetY: current.lastY - currentRect.top,
      lastX: current.lastX,
      lastY: current.lastY,
    }
    pressRef.current = null

    const scrollContainer = row.closest("main") as HTMLElement | null
    scrollContainerRef.current = scrollContainer
    if (scrollContainer) {
      originalScrollBehaviorRef.current = scrollContainer.style.scrollBehavior
      scrollContainer.style.scrollBehavior = "auto"
    }

    try {
      row.setPointerCapture?.(current.pointerId)
    } catch {
      // The pointer may have ended between the timer and activation.
    }

    setDraggingId(current.category.id)
    setDropIndex(current.sourceIndex)
    setDragPreview({
      left: currentRect.left,
      top: currentRect.top,
      width: currentRect.width,
      height: currentRect.height,
    })
    return true
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
      lastX: event.clientX,
      lastY: event.clientY,
      startedAt: Date.now(),
      originRect: row.getBoundingClientRect(),
      timer: setTimeout(() => {
        const current = pressRef.current
        if (!current || current.pointerId !== event.pointerId) return
        activateDrag(current)
      }, 90),
    }

    pressRef.current = press

    // Captura o ponteiro desde o início para o movimento vertical não ser
    // interpretado pelo navegador como um gesto horizontal/lateral.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Alguns navegadores podem rejeitar a captura após o toque terminar.
    }
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

    function getEdgeScrollStep(clientY: number, scrollBounds: DOMRect) {
      const edgeSize = Math.min(112, Math.max(64, scrollBounds.height * 0.16))
      const maxStep = 8
      const minStep = 1.5
      const topEdge = scrollBounds.top + edgeSize
      const bottomEdge = scrollBounds.bottom - edgeSize

      if (clientY <= topEdge) {
        const intensity = Math.min(1, (topEdge - clientY) / edgeSize)
        return -Math.max(minStep, intensity * maxStep)
      }

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
      const rawLeft = clientX - drag.grabOffsetX
      const minLeft = bounds.left
      const maxLeft = Math.max(minLeft, bounds.right - drag.originRect.width)
      const clampedLeft = Math.min(Math.max(rawLeft, minLeft), maxLeft)
      setDragPreview((current) =>
        current
          ? {
              ...current,
              left: clampedLeft,
              top: clientY - drag.grabOffsetY,
            }
          : current,
      )

      const insideList = clientY >= bounds.top && clientY <= bounds.bottom
      const withinListWidth = true
      const scrollContainer = scrollContainerRef.current
      const scrollBounds = scrollContainer?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
      const edgeSize = Math.min(112, Math.max(64, scrollBounds.height * 0.16))
      const nearTopEdge = withinListWidth && clientY <= scrollBounds.top + edgeSize
      const nearBottomEdge = withinListWidth && clientY >= scrollBounds.bottom - edgeSize

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

      const scrollTarget = scrollContainerRef.current
      if (!scrollTarget) {
        stopAutoScroll()
        return
      }

      const step = getEdgeScrollStep(drag.lastY, scrollTarget.getBoundingClientRect())
      if (step === 0) {
        stopAutoScroll()
        return
      }

      const maxScrollTop = Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight)
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
        const previousY = press.lastY
        press.lastX = event.clientX
        press.lastY = event.clientY
        const movedY = Math.abs(event.clientY - press.startY)
        const elapsed = Date.now() - press.startedAt
        const deltaY = event.clientY - previousY
        const movedX = Math.abs(event.clientX - press.startX)

        const row = rowRefs.current[press.category.id]
        const scrollContainer = row?.closest("main") as HTMLElement | null
        if (scrollContainer && deltaY !== 0 && elapsed < 90) {
          scrollContainer.scrollTop += deltaY
        }

        if (movedY >= 2 && elapsed >= 40) {
          window.clearTimeout(press.timer)
          if (activateDrag(press)) {
            const activeDrag = dragRef.current
            if (activeDrag) {
              event.preventDefault()
              activeDrag.lastX = event.clientX
              activeDrag.lastY = event.clientY
              updateDragPosition(event.clientX, event.clientY)
              scheduleAutoScroll()
            }
          }
          return
        }

        if (movedX > 24 && movedX > movedY * 1.5) {
          cancelPendingPress(event.pointerId)
        }
        return
      }

      const activeDrag = dragRef.current
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) return

      event.preventDefault()
      activeDrag.lastX = event.clientX
      activeDrag.lastY = event.clientY
      updateDragPosition(event.clientX, event.clientY)
      scheduleAutoScroll()
    }

    function restoreScrollBehavior() {
      const scrollContainer = scrollContainerRef.current
      if (scrollContainer && originalScrollBehaviorRef.current !== null) {
        scrollContainer.style.scrollBehavior = originalScrollBehaviorRef.current
      }
      scrollContainerRef.current = null
      originalScrollBehaviorRef.current = null
    }

    function finishDrag(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) {
        cancelPendingPress(event.pointerId)
        return
      }
      if (event.pointerId !== drag.pointerId) return

      stopAutoScroll()
      restoreScrollBehavior()
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
      restoreScrollBehavior()
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
      restoreScrollBehavior()
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
                      : "touch-none sm:touch-auto"
                  }`}
                  onPointerDown={(event) => beginPress(event, c)}
                  aria-grabbed={isDragging}
                >
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
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
                    <Badge
                      variant="outline"
                      className={`shrink-0 sm:hidden ${
                        c.status === "active"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-muted-foreground/30 bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
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

                    <div className="inline-flex min-w-0 items-baseline gap-1.5 sm:min-w-12 sm:flex sm:flex-col sm:items-end sm:gap-0">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Produtos</span>
                      <span className="text-sm font-medium text-muted-foreground">{c.productCount}</span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`hidden shrink-0 sm:inline-flex ${
                        c.status === "active"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-muted-foreground/30 bg-muted text-muted-foreground"
                      }`}
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
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
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
                  <Badge
                    variant="outline"
                    className={
                      draggedCategory.status === "active"
                        ? "shrink-0 border-success/30 bg-success/10 text-success"
                        : "shrink-0 border-muted-foreground/30 bg-muted text-muted-foreground"
                    }
                  >
                    {draggedCategory.status === "active" ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Produtos</span>
                  <span className="text-sm font-medium text-muted-foreground">{draggedCategory.productCount}</span>
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
