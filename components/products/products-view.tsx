"use client"

import { useMemo, useState, useTransition } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ProductDialog } from "./product-dialog"
import {
  duplicateProduct,
  deleteProduct,
  setProductStatus,
} from "@/app/actions/products"
import { formatCurrency } from "@/lib/format"
import { toast } from "sonner"
import { useMediaQuery } from "@/hooks/use-mobile"
import {
  Plus,
  Search,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  Power,
  FolderTree,
  Package,
  Eye,
  Plus as PlusIcon,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Boxes,
  Filter,
  ChevronDown,
  CircleDollarSign,
  Warehouse,
  Sparkles,
} from "lucide-react"
import type { ProductWithStats, ProductStats, SortOption, FilterOption } from "@/app/actions/products-refactored"

type Category = { id: number; name: string; description: string | null }

const PAGE_SIZE = 10

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Nome (A-Z)" },
  { value: "name-desc", label: "Nome (Z-A)" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
  { value: "stock", label: "Estoque" },
  { value: "updated", label: "Última atualização" },
  { value: "created", label: "Data de criação" },
  { value: "sold-desc", label: "Mais vendidos" },
  { value: "sold-asc", label: "Menos vendidos" },
  { value: "status", label: "Status" },
]

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "no-stock", label: "Sem estoque" },
  { value: "low-stock", label: "Estoque baixo" },
  { value: "auto-delivery", label: "Entrega automática" },
  { value: "manual-delivery", label: "Entrega manual" },
]

export function ProductsView({
  products,
  categories,
  stats,
}: {
  products: ProductWithStats[]
  categories: Category[]
  stats: ProductStats
}) {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortOption>("name-asc")
  const [filters, setFilters] = useState<FilterOption[]>(["all"])
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [, startTransition] = useTransition()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [productDialog, setProductDialog] = useState<{
    open: boolean
    product?: ProductWithStats | null
  }>({ open: false })

  // Filtrar produtos
  const filtered = useMemo(() => {
    let result = products

    // Busca
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.categoryName?.toLowerCase().includes(q) ||
          String(p.id).includes(q) ||
          p.price.toLowerCase().includes(q)
        )
      })
    }

    // Filtros
    const activeFilters = filters.filter((f) => f !== "all")
    if (activeFilters.length > 0) {
      result = result.filter((p) => {
        return activeFilters.some((f) => {
          switch (f) {
            case "active":
              return p.status === "active"
            case "inactive":
              return p.status === "inactive"
            case "no-stock":
              return p.deliveryType === "stock" && p.stockAvailable === 0
            case "low-stock":
              return p.deliveryType === "stock" && p.stockAvailable > 0 && p.stockAvailable <= p.lowStockThreshold
            case "auto-delivery":
              return p.deliveryType === "stock"
            case "manual-delivery":
              return p.deliveryType === "manual"
            default:
              return true
          }
        })
      })
    }

    // Categoria
    if (categoryFilter !== "all") {
      result = result.filter((p) => String(p.categoryId) === categoryFilter)
    }

    // Ordenação
    result.sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "price-asc":
          return Number(a.price) - Number(b.price)
        case "price-desc":
          return Number(b.price) - Number(a.price)
        case "stock":
          return b.stockAvailable - a.stockAvailable
        case "updated":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "sold-asc":
          return a.salesCount - b.salesCount
        case "sold-desc":
          return b.salesCount - a.salesCount
        case "status":
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    return result
  }, [products, search, sort, filters, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function action(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(successMsg)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  const toggleFilter = (filter: FilterOption) => {
    setFilters((prev) => {
      if (filter === "all") {
        return ["all"]
      }
      const next = prev.filter((f) => f !== "all")
      if (next.includes(filter)) {
        return next.filter((f) => f !== filter)
      }
      return [...next, filter]
    })
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Catálogo
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Produtos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Organize seus produtos, preços, entrega e disponibilidade em um só lugar.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setProductDialog({ open: true, product: null })}>
          <Plus className="mr-2 h-4 w-4" />
          Novo produto
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.08] to-card shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de produtos</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Package className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeProducts} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque disponível</CardTitle>
            <div className="rounded-lg bg-success/10 p-2 text-success"><Warehouse className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.noStockProducts} sem estoque
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Preço médio</CardTitle>
            <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><CircleDollarSign className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averagePrice)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatCurrency(stats.totalStockValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/[0.04] shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas de estoque</CardTitle>
            <div className="rounded-lg bg-warning/10 p-2 text-warning"><AlertCircle className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Estoque baixo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome, preço, categoria..."
              className="pl-9"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v ?? "all")
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link href="/categories" className="col-span-2 sm:col-span-1">
              <Button variant="outline" className="w-full">
                <FolderTree className="mr-2 h-4 w-4" />
                Categorias
              </Button>
            </Link>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full justify-between sm:hidden"
          onClick={() => setShowFilters((value) => !value)}
        >
          <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros e segmentação</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </Button>

        {/* Filtros */}
        <div className={`${showFilters ? "flex" : "hidden sm:flex"} flex-wrap gap-2 rounded-xl border border-border/70 bg-muted/20 p-2`}>
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={filters.includes(opt.value) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabela Desktop */}
      {!isMobile && (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-40" />
                      Nenhum produto encontrado.
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((p) => {
                const lowStock =
                  p.deliveryType === "stock" && p.stockAvailable <= p.lowStockThreshold
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.categoryEmoji && <span className="mr-1">{p.categoryEmoji}</span>}
                      {p.categoryName ?? "—"}
                    </TableCell>
                    <TableCell>{formatCurrency(p.price)}</TableCell>
                    <TableCell>
                      {p.deliveryType === "manual" ? (
                        <span className="text-muted-foreground">Manual</span>
                      ) : (
                        <span className={lowStock ? "text-warning font-medium" : ""}>
                          {p.stockAvailable}
                          {lowStock && " ⚠"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {p.salesCount > 0 ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-success" />
                            <span>{p.salesCount}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.deliveryType === "stock" ? "Automática" : "Manual"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.status === "active"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-muted-foreground/30 bg-muted text-muted-foreground"
                        }
                      >
                        {p.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Ações do produto {p.name}</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setProductDialog({ open: true, product: p })}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              action(
                                () =>
                                  setProductStatus(
                                    p.id,
                                    p.status === "active" ? "inactive" : "active",
                                  ),
                                "Status atualizado",
                              )
                            }
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {p.status === "active" ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              action(() => duplicateProduct(p.id), "Produto duplicado")
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              action(() => deleteProduct(p.id), "Produto excluído")
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Cards Mobile */}
      {isMobile && (
        <div className="grid gap-3">
          {paginated.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-32 gap-2">
                <Package className="h-8 w-8 opacity-40" />
                <p className="text-muted-foreground">Nenhum produto encontrado.</p>
              </CardContent>
            </Card>
          )}
          {paginated.map((p) => {
            const lowStock =
              p.deliveryType === "stock" && p.stockAvailable <= p.lowStockThreshold
            return (
              <Card key={p.id} className="overflow-hidden border-border/80 shadow-sm">
                <CardHeader className="bg-muted/20 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <CardTitle className="truncate text-base">{p.name}</CardTitle>
                        <Badge
                          variant="outline"
                          className={p.status === "active" ? "border-success/30 bg-success/10 text-success" : "border-muted-foreground/30 bg-muted text-muted-foreground"}
                        >
                          {p.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      {p.categoryName && (
                        <CardDescription>
                          {p.categoryEmoji && <span className="mr-1">{p.categoryEmoji}</span>}
                          {p.categoryName}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setProductDialog({ open: true, product: p })}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            action(
                              () =>
                                setProductStatus(
                                  p.id,
                                  p.status === "active" ? "inactive" : "active",
                                ),
                              "Status atualizado",
                            )
                          }
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {p.status === "active" ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            action(() => duplicateProduct(p.id), "Produto duplicado")
                          }
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            action(() => deleteProduct(p.id), "Produto excluído")
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="rounded-lg bg-muted/30 p-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Preço</p>
                      <p className="text-sm font-semibold">{formatCurrency(p.price)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estoque</p>
                      <p className={`text-sm font-semibold ${lowStock ? "text-warning" : ""}`}>
                        {p.deliveryType === "manual" ? "Manual" : p.stockAvailable}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vendas</p>
                      <p className="text-sm font-semibold">{p.salesCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Entrega</p>
                      <p className="text-sm font-semibold">
                        {p.deliveryType === "stock" ? "Automática" : "Manual"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">
                      {lowStock ? "Requer reposição" : "Operação normal"}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {p.deliveryType === "stock" ? "Entrega automática" : "Entrega manual"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {filtered.length} produto(s) — página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <ProductDialog
        open={productDialog.open}
        onOpenChange={(v) => setProductDialog((s) => ({ ...s, open: v }))}
        categories={categories}
        product={productDialog.product}
      />
    </div>
  )
}
