"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StockDialog } from "./stock-dialog"
import { Boxes, Plus, AlertTriangle } from "lucide-react"

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

  if (summary.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <Boxes className="h-8 w-8 opacity-40" />
        <p>Nenhum produto cadastrado ainda.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summary.map((s) => {
          const low =
            s.deliveryType === "stock" && s.available <= s.lowStockThreshold
          return (
            <Card key={s.productId} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{s.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.deliveryType === "stock" ? "Entrega automática" : "Entrega manual"}
                    </p>
                  </div>
                </div>
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
                <div className="rounded-lg bg-muted/50 py-2">
                  <p className="text-lg font-semibold text-success">{s.available}</p>
                  <p className="text-xs text-muted-foreground">Disponível</p>
                </div>
                <div className="rounded-lg bg-muted/50 py-2">
                  <p className="text-lg font-semibold">{s.sold}</p>
                  <p className="text-xs text-muted-foreground">Vendidos</p>
                </div>
                <div className="rounded-lg bg-muted/50 py-2">
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

      <StockDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))}
        productId={dialog.productId}
        productName={dialog.productName}
      />
    </>
  )
}
