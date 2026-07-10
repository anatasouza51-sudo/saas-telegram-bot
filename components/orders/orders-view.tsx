"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { OrderRow } from "@/lib/queries/records"
import {
  approveAndDeliver,
  refuseOrder,
  cancelOrder,
} from "@/app/actions/orders"
import { useTransition } from "react"

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
    return orders.filter((o) => {
      const matchesStatus = status === "all" || o.paymentStatus === status
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        o.productName?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerUsername?.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        o.paymentId?.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [orders, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>Pedidos ({filtered.length})</CardTitle>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Buscar por cliente, produto, ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="sm:max-w-xs"
          />
          <Select
            items={{
              all: "Todos status",
              pending: "Pendente",
              approved: "Aprovado",
              refused: "Recusado",
              cancelled: "Cancelado",
            }}
            value={status}
            onValueChange={(v) => {
              setStatus(v as string)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="refused">Recusado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Data</TableHead>
                {canManage && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 9 : 8}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {String(o.id).padStart(4, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {o.customerName || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.customerUsername
                          ? `@${o.customerUsername}`
                          : o.customerTelegramId || ""}
                      </div>
                    </TableCell>
                    <TableCell>{o.productName || "—"}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(o.amount)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <DeliveryStatusBadge status={o.deliveryStatus} />
                    </TableCell>
                    <TableCell className="uppercase text-xs text-muted-foreground">
                      {o.gateway}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(o.createdAt)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isPending}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Ações</span>
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={o.deliveryStatus === "delivered"}
                              onClick={() =>
                                runAction(
                                  () => approveAndDeliver(o.id),
                                  `Pedido #${o.id} aprovado e entregue`,
                                )
                              }
                            >
                              Aprovar e entregar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                runAction(
                                  () => refuseOrder(o.id),
                                  `Pedido #${o.id} recusado`,
                                )
                              }
                            >
                              Recusar pagamento
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                runAction(
                                  () => cancelOrder(o.id),
                                  `Pedido #${o.id} cancelado`,
                                )
                              }
                            >
                              Cancelar pedido
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
