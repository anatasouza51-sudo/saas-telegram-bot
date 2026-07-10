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
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { CustomerRow } from "@/lib/queries/records"

export function CustomersView({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return customers.filter(
      (c) =>
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.telegramId.includes(q),
    )
  }, [customers, search])

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>Clientes ({filtered.length})</CardTitle>
        <Input
          placeholder="Buscar por nome, username ou Telegram ID..."
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
                <TableHead>Cliente</TableHead>
                <TableHead>Telegram ID</TableHead>
                <TableHead>Compras</TableHead>
                <TableHead>Total gasto</TableHead>
                <TableHead>Última compra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.username ? `@${c.username}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.telegramId}
                    </TableCell>
                    <TableCell>{c.purchaseCount}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(c.totalSpent)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.lastPurchaseAt ? formatDateTime(c.lastPurchaseAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === "active" ? "default" : "secondary"}
                      >
                        {c.status === "active" ? "Ativo" : "Bloqueado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(c.createdAt)}
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
