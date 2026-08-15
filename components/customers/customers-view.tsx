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
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { CustomerRow } from "@/lib/queries/records"

const PAGE_SIZE = 10

export function CustomersView({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
            </div>
            <Input
              placeholder="Buscar por nome, username ou Telegram ID..."
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
              Nenhum cliente encontrado.
            </div>
          ) : (
            pageItems.map((c) => (
              <article key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between gap-3 border-b border-border/70 p-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">{c.name || "—"}</h3>
                    {c.username && (
                      <p className="mt-1 break-all text-sm text-muted-foreground">@{c.username}</p>
                    )}
                  </div>
                  <Badge
                    className="shrink-0"
                    variant={c.status === "active" ? "default" : "secondary"}
                  >
                    {c.status === "active" ? "Ativo" : "Bloqueado"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                  <div className="min-w-0 rounded-lg bg-muted/30 p-3">
                    <span className="text-xs text-muted-foreground">Telegram ID</span>
                    <p className="mt-1 break-all font-mono text-sm">{c.telegramId}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <span className="text-xs text-muted-foreground">Compras</span>
                    <p className="mt-1 font-semibold">{c.purchaseCount}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <span className="text-xs text-muted-foreground">Total gasto</span>
                    <p className="mt-1 font-semibold">{formatCurrency(c.totalSpent)}</p>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/30 p-3">
                    <span className="text-xs text-muted-foreground">Última compra</span>
                    <p className="mt-1 break-words text-sm font-medium">
                      {c.lastPurchaseAt ? formatDateTime(c.lastPurchaseAt) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
                  <span>Cadastro</span>
                  <span className="text-right">{formatDateTime(c.createdAt)}</span>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
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
                pageItems.map((c) => (
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
