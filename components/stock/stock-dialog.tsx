"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  addStockItems,
  listStockItems,
  deleteStockItem,
  exportStock,
} from "@/app/actions/stock"
import { formatDateTime } from "@/lib/format"
import { toast } from "sonner"
import { Trash2, Download, Loader2 } from "lucide-react"

type StockItem = {
  id: number
  content: string
  status: string
  soldAt: Date | null
  createdAt: Date
}

export function StockDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  productId: number | null
  productName: string
}) {
  const [raw, setRaw] = useState("")
  const [available, setAvailable] = useState<StockItem[]>([])
  const [sold, setSold] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()

  async function refresh() {
    if (!productId) return
    setLoading(true)
    try {
      const [a, s] = await Promise.all([
        listStockItems(productId, "available"),
        listStockItems(productId, "sold"),
      ])
      setAvailable(a as StockItem[])
      setSold(s as StockItem[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && productId) {
      refresh()
      setRaw("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId])

  function handleAdd() {
    if (!productId) return
    if (!raw.trim()) {
      toast.error("Informe ao menos um item")
      return
    }
    startTransition(async () => {
      try {
        const count = await addStockItems(productId, raw)
        toast.success(`${count} item(ns) adicionado(s)`)
        setRaw("")
        await refresh()
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        await deleteStockItem(id)
        toast.success("Item removido")
        await refresh()
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  async function handleExport() {
    if (!productId) return
    try {
      const data = await exportStock(productId, "available")
      const blob = new Blob([data], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `estoque-${productName.replace(/\s+/g, "-").toLowerCase()}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Estoque — {productName}</DialogTitle>
          <DialogDescription>
            Adicione itens (um por linha). Cada item é entregue apenas uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={5}
            placeholder={"email1@gmail.com | senha123\nemail2@gmail.com | senha456"}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {raw.split("\n").filter((l) => l.trim()).length} linha(s)
            </span>
            <Button onClick={handleAdd} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar ao estoque
            </Button>
          </div>
        </div>

        <Tabs defaultValue="available" className="mt-2">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="available">
                Disponíveis
                <Badge variant="secondary" className="ml-2">
                  {available.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sold">
                Vendidos
                <Badge variant="secondary" className="ml-2">
                  {sold.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>

          <TabsContent value="available" className="mt-3">
            <StockList
              items={available}
              loading={loading}
              onDelete={handleDelete}
              deletable
            />
          </TabsContent>
          <TabsContent value="sold" className="mt-3">
            <StockList items={sold} loading={loading} showSoldAt />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function StockList({
  items,
  loading,
  onDelete,
  deletable,
  showSoldAt,
}: {
  items: StockItem[]
  loading: boolean
  onDelete?: (id: number) => void
  deletable?: boolean
  showSoldAt?: boolean
}) {
  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum item.
      </p>
    )
  }
  return (
    <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
        >
          <span className="truncate font-mono text-xs">{item.content}</span>
          <div className="flex shrink-0 items-center gap-2">
            {showSoldAt && (
              <span className="text-xs text-muted-foreground">
                {formatDateTime(item.soldAt)}
              </span>
            )}
            {deletable && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
