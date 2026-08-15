"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"
import type { DeliveryRow } from "@/lib/queries/records"

const PAGE_SIZE = 10

export function DeliveriesView({ deliveries }: { deliveries: DeliveryRow[] }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return deliveries.filter(
      (d) =>
        !q ||
        d.productName?.toLowerCase().includes(q) ||
        d.customerName?.toLowerCase().includes(q) ||
        d.customerTelegramId?.includes(q) ||
        String(d.orderId).includes(q),
    )
  }, [deliveries, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              {filtered.length} entrega{filtered.length !== 1 ? 's' : ''}
            </div>
            <Input
              placeholder="Buscar por produto, cliente, pedido..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="sm:max-w-xs"
            />
          </div>
        </div>

        <div className="grid gap-3 md:hidden">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-muted-foreground">
              Nenhuma entrega registrada.
            </div>
          ) : (
            pageItems.map((d) => (
              <article key={d.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between gap-3 border-b border-border/70 p-4">
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Pedido</span>
                    <h3 className="mt-1 break-all font-mono text-sm font-semibold">
                      #{String(d.orderId).padStart(4, "0")}
                    </h3>
                  </div>
                  <Badge className="shrink-0" variant="default">Entregue</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                  <div className="min-w-0 rounded-lg bg-muted/30 p-3">
                    <span className="text-xs text-muted-foreground">Produto</span>
                    <p className="mt-1 break-words font-medium">{d.productName || "—"}</p>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/30 p-3">
                    <span className="text-xs text-muted-foreground">Cliente</span>
                    <p className="mt-1 break-words font-medium">{d.customerName || "—"}</p>
                    {d.customerTelegramId && (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{d.customerTelegramId}</p>
                    )}
                  </div>
                  <div className="col-span-2 min-w-0 rounded-lg bg-muted/30 p-3">
                    <span className="text-xs text-muted-foreground">Item entregue</span>
                    <p className="mt-1 break-words whitespace-pre-wrap font-mono text-sm text-muted-foreground">
                      {d.deliveredContent || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
                  <span>Data da entrega</span>
                  <span className="text-right">{formatDateTime(d.createdAt)}</span>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Item entregue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhuma entrega registrada.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{String(d.orderId).padStart(4, "0")}
                    </TableCell>
                    <TableCell>{d.productName || "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{d.customerName || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.customerTelegramId || ""}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                      {d.deliveredContent || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Entregue</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(d.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="mr-1 size-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={currentPage === totalPages}
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
  )
}
