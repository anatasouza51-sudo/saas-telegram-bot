"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StockDialog } from "./stock-dialog"
import {
  Boxes,
  Plus,
  AlertTriangle,
  Sparkles,
  PackageCheck,
  TrendingUp,
  Warehouse,
} from "lucide-react"

type Summary = {
  productId: number
  productName: string
  deliveryType: string
  lowStockThreshold: number
  available: number
  sold: number
  reserved: number
}

export function StockView({ summary }: { summary: Summary[] }) {
  const [dialog, setDialog] = useState<{
    open: boolean
    productId: number | null
    productName: string
  }>({ open: false, productId: null, productName: "" })

  function openStock(productId: number, productName: string) {
    setDialog({ open: true, productId, productName })
  }

  const lowStockCount = summary.filter(
    (s) => s.deliveryType === "stock" && s.available <= s.lowStockThreshold,
  ).length
  const availableTotal = summary.reduce((total, item) => total + item.available, 0)
  const reservedTotal = summary.reduce((total, item) => total + item.reserved, 0)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Catálogo
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe disponibilidade, reservas e reposição dos seus produtos.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm">
          <Warehouse className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{summary.length} produto(s)</span>
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-3">
        <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] to-card p-4 shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Disponíveis</p>
            <PackageCheck className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{availableTotal}</p>
          <p className="mt-1 text-xs text-muted-foreground">Unidades prontas para venda</p>
        </div>
        <div className="rounded-xl border border-warning/20 bg-warning/[0.06] p-4 shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Estoque baixo</p>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{lowStockCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Produto(s) que precisam de reposição</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Reservados</p>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{reservedTotal}</p>
          <p className="mt-1 text-xs text-muted-foreground">Unidades aguardando processamento</p>
        </div>
      </div>

      {summary.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-xl border-dashed p-10 text-center text-muted-foreground shadow-sm">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Boxes className="h-7 w-7" />
          </div>
          <div>
            <p className="font-medium text-foreground">Nenhum produto cadastrado ainda.</p>
            <p className="mt-1 text-sm">Cadastre um produto para começar a controlar o estoque.</p>
          </div>
        </Card>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summary.map((s) => {
          const low =
            s.deliveryType === "stock" && s.available <= s.lowStockThreshold
          return (
            <Card key={s.productId} className="flex flex-col gap-4 overflow-hidden rounded-xl border-border/80 p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">{s.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.deliveryType === "stock" ? "Entrega automática" : "Entrega manual"}
                    </p>
                  </div>
                </div>
                {!low && s.deliveryType === "stock" && (
                  <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                    Disponível
                  </Badge>
                )}
                {low && (
                  <Badge
                    variant="outline"
                    className="border-warning/30 bg-warning/10 text-warning"
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Baixo
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-lg font-semibold text-success">{s.available}</p>
                  <p className="text-xs text-muted-foreground">Disponível</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-lg font-semibold">{s.sold}</p>
                  <p className="text-xs text-muted-foreground">Vendidos</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-lg font-semibold text-warning">{s.reserved}</p>
                  <p className="text-xs text-muted-foreground">Reservados</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => openStock(s.productId, s.productName)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Gerenciar estoque
              </Button>
            </Card>
          )
        })}
      </div>
      )}

      <StockDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))}
        productId={dialog.productId}
        productName={dialog.productName}
      />
    </>
  )
}
