"use client"

import { useMemo, useState, useTransition } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MoreHorizontal,
  Package,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  PaymentStatusBadge,
  DeliveryStatusBadge,
} from "@/components/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { OrderRow } from "@/lib/queries/records"
import {
  approveAndDeliver,
  refuseOrder,
  cancelOrder,
} from "@/app/actions/orders"

const PAGE_SIZE = 10

export function OrdersView({
  orders,
  canManage = false,
}: {
  orders: OrderRow[]
  canManage?: boolean
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  function runAction(fn: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(success)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro na operação")
      }
    })
  }

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = status === "all" || order.paymentStatus === status
      const query = search.trim().toLowerCase()
      const matchesSearch =
        !query ||
        order.productName?.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.customerUsername?.toLowerCase().includes(query) ||
        String(order.id).includes(query) ||
        order.paymentId?.toLowerCase().includes(query)
      return matchesStatus && matchesSearch
    })
  }, [orders, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-dashboard-border/80 bg-dashboard-surface/70 p-4 shadow-[0_0_30px_rgba(169,201,127,0.08)] sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-dashboard-accent">
            <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
            Operação de vendas
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-dashboard-text sm:text-3xl">Pedidos</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-dashboard-text-muted">
            Acompanhe pagamentos, entregas e clientes em uma visão organizada.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-dashboard-border bg-dashboard-bg/60 px-3 py-2 text-sm text-dashboard-text-muted">
          <Package className="size-4 text-dashboard-accent" aria-hidden="true" />
          <span>{filtered.length} pedido{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <Card className="min-w-0 overflow-hidden rounded-[24px] border-dashboard-border/80 bg-dashboard-surface shadow-none">
        <CardContent className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 border-b border-dashboard-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dashboard-text-muted" aria-hidden="true" />
              <Input
                placeholder="Buscar por cliente, produto ou ID..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                className="h-11 min-w-0 border-dashboard-border bg-dashboard-bg/60 pl-10 text-sm"
              />
            </div>
            <Select
              items={{
                all: "Todos os status",
                pending: "Pendente",
                approved: "Aprovado",
                refused: "Recusado",
                cancelled: "Cancelado",
              }}
              value={status}
              onValueChange={(value) => {
                setStatus(value as string)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-11 w-full border-dashboard-border bg-dashboard-bg/60 sm:w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="refused">Recusado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dashboard-border px-4 py-16 text-center">
              <ShoppingBag className="mb-3 size-8 text-dashboard-text-muted/50" aria-hidden="true" />
              <p className="font-medium text-dashboard-text">Nenhum pedido encontrado</p>
              <p className="mt-1 text-sm text-dashboard-text-muted">Tente alterar a busca ou o filtro de status.</p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-3 pt-5 xl:grid-cols-2">
              {pageItems.map((order) => (
                <article
                  key={order.id}
                  className="isolate min-w-0 rounded-2xl border border-transparent bg-dashboard-surface p-4 shadow-none transition-colors hover:border-dashboard-border/30 hover:bg-dashboard-surface-elevated/20 sm:p-5"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-dashboard-text-muted">
                        Pedido #{String(order.id).padStart(4, "0")}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-dashboard-text-muted">
                        <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 rounded-xl text-dashboard-text-muted hover:bg-dashboard-accent/10 hover:text-dashboard-accent"
                              disabled={isPending}
                            >
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                              <span className="sr-only">Ações do pedido</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={order.deliveryStatus === "delivered"}
                            onClick={() =>
                              runAction(
                                () => approveAndDeliver(order.id),
                                `Pedido #${order.id} aprovado e entregue`,
                              )
                            }
                          >
                            Aprovar e entregar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              runAction(
                                () => refuseOrder(order.id),
                                `Pedido #${order.id} recusado`,
                              )
                            }
                          >
                            Recusar pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              runAction(
                                () => cancelOrder(order.id),
                                `Pedido #${order.id} cancelado`,
                              )
                            }
                          >
                            Cancelar pedido
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-dashboard-text-muted">Produto</p>
                      <p className="mt-1 break-words text-base font-semibold text-dashboard-text">{order.productName || "Pedido de saldo"}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-dashboard-text-muted">Valor</p>
                      <p className="mt-1 text-xl font-bold text-dashboard-text">{formatCurrency(order.amount)}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid min-w-0 gap-3 pt-4 sm:grid-cols-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <UserRound className="mt-0.5 size-4 shrink-0 text-dashboard-accent" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-dashboard-text-muted">Cliente</p>
                        <p className="mt-1 break-words text-sm font-medium text-dashboard-text">{order.customerName || "Cliente não informado"}</p>
                        <p className="truncate text-xs text-dashboard-text-muted">
                          {order.customerUsername ? `@${order.customerUsername}` : order.customerTelegramId || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2">
                      <CreditCard className="mt-0.5 size-4 shrink-0 text-dashboard-accent" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-dashboard-text-muted">Gateway</p>
                        <p className="mt-1 truncate text-sm font-medium uppercase text-dashboard-text">{order.gateway || "—"}</p>
                        <p className="truncate text-xs text-dashboard-text-muted">{order.paymentId || "Pagamento não identificado"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2 pt-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <CreditCard className="size-3.5 shrink-0 text-dashboard-text-muted" aria-hidden="true" />
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Truck className="size-3.5 shrink-0 text-dashboard-text-muted" aria-hidden="true" />
                      <DeliveryStatusBadge status={order.deliveryStatus} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-dashboard-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-dashboard-text-muted">Página {page} de {totalPages}</span>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="mr-1 size-4" aria-hidden="true" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Próxima
                  <ChevronRight className="ml-1 size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
