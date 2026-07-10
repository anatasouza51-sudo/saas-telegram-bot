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

export function DeliveriesView({ deliveries }: { deliveries: DeliveryRow[] }) {
  const [search, setSearch] = useState("")

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

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>Histórico de entregas ({filtered.length})</CardTitle>
        <Input
          placeholder="Buscar por produto, cliente, pedido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                filtered.map((d) => (
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
      </CardContent>
    </Card>
  )
}
