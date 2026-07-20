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
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"

type Log = {
  id: number
  action: string
  category: string
  actorName: string | null
  details: string | null
  createdAt: Date
}

const CATEGORY_LABELS: Record<string, string> = {
  auth: "Autenticação",
  product: "Produtos",
  stock: "Estoque",
  order: "Pedidos",
  payment: "Pagamentos",
  delivery: "Entregas",
  admin: "Administração",
  settings: "Configurações",
  system: "Sistema",
  security: "Segurança",
  posts: "Divulgação",
}

export function LogsView({ logs }: { logs: Log[] }) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")

  const categoryItems = useMemo(() => {
    const items: Record<string, string> = { all: "Todas categorias" }
    for (const key of Object.keys(CATEGORY_LABELS)) {
      items[key] = CATEGORY_LABELS[key]
    }
    return items
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return logs.filter((l) => {
      const matchesCat = category === "all" || l.category === category
      const matchesSearch =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.actorName?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })
  }, [logs, search, category])

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>Registro de atividades ({filtered.length})</CardTitle>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Buscar nos logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select
            items={categoryItems}
            value={category}
            onValueChange={(v) => setCategory(v as string)}
          >
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            Nenhum registro encontrado.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {filtered.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">
                      {CATEGORY_LABELS[l.category] ?? l.category}
                    </Badge>
                    <span className="text-sm font-medium">{l.action}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.actorName ? `Por ${l.actorName}` : "Sistema"}
                    {l.details ? ` · ${l.details}` : ""}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(l.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
