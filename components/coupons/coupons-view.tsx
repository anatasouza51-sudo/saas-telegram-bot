"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  Tag,
  Ticket,
  CheckCircle,
  XCircle,
  Clock,
  Hash,
} from "lucide-react"
import {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  setCouponStatus,
  type Coupon,
  type CouponInput,
} from "@/app/actions/coupons"

function formatDate(date: Date | null | string): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function isCouponExpired(coupon: Coupon): boolean {
  if (!coupon.expiresAt) return false
  return new Date(coupon.expiresAt) < new Date()
}

function isCouponExhausted(coupon: Coupon): boolean {
  if (coupon.maxUses == null) return false
  return coupon.usedCount >= coupon.maxUses
}

function CouponStatusBadge({ coupon }: { coupon: Coupon }) {
  if (coupon.status === "inactive") {
    return (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3 w-3" />
        Inativo
      </Badge>
    )
  }
  if (isCouponExpired(coupon)) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock className="h-3 w-3" />
        Expirado
      </Badge>
    )
  }
  if (isCouponExhausted(coupon)) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Hash className="h-3 w-3" />
        Esgotado
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-green-600 hover:bg-green-700 text-white">
      <CheckCircle className="h-3 w-3" />
      Ativo
    </Badge>
  )
}

type FormState = {
  code: string
  discountPercent: string
  maxUses: string
  status: "active" | "inactive"
  expiresAt: string
}

const EMPTY_FORM: FormState = {
  code: "",
  discountPercent: "",
  maxUses: "",
  status: "active",
  expiresAt: "",
}

function couponToForm(c: Coupon): FormState {
  return {
    code: c.code,
    discountPercent: String(c.discountPercent),
    maxUses: c.maxUses != null ? String(c.maxUses) : "",
    status: c.status as "active" | "inactive",
    expiresAt: c.expiresAt
      ? new Date(c.expiresAt).toISOString().slice(0, 16)
      : "",
  }
}

export function CouponsView({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditingCoupon(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(coupon: Coupon) {
    setEditingCoupon(coupon)
    setForm(couponToForm(coupon))
    setDialogOpen(true)
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const input: CouponInput = {
          code: form.code,
          discountPercent: Number(form.discountPercent),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          status: form.status,
          expiresAt: form.expiresAt || null,
        }

        if (editingCoupon) {
          const updated = await updateCoupon(editingCoupon.id, input)
          setCoupons((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          )
          toast.success("Cupom atualizado com sucesso!")
        } else {
          const created = await createCoupon(input)
          setCoupons((prev) => [created, ...prev])
          toast.success("Cupom criado com sucesso!")
        }
        setDialogOpen(false)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleToggleStatus(coupon: Coupon) {
    const next = coupon.status === "active" ? "inactive" : "active"
    startTransition(async () => {
      try {
        await setCouponStatus(coupon.id, next)
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, status: next } : c)),
        )
        toast.success(
          next === "active" ? "Cupom ativado." : "Cupom desativado.",
        )
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleDelete(coupon: Coupon) {
    startTransition(async () => {
      try {
        await deleteCoupon(coupon.id)
        setCoupons((prev) => prev.filter((c) => c.id !== coupon.id))
        toast.success("Cupom excluído.")
        setDeleteTarget(null)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  const activeCoupons = coupons.filter(
    (c) =>
      c.status === "active" && !isCouponExpired(c) && !isCouponExhausted(c),
  ).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Cupons de Desconto
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e gerencie cupons que os clientes aplicam antes de pagar no
            bot.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Cupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cupons Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeCoupons}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coupons.reduce((sum, c) => sum + c.usedCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {coupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Tag className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Nenhum cupom criado ainda.
            </p>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro cupom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono font-bold">
                      {coupon.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">
                      {coupon.discountPercent}% OFF
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {coupon.usedCount}
                      {coupon.maxUses != null
                        ? ` / ${coupon.maxUses}`
                        : " / ∞"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(coupon.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <CouponStatusBadge coupon={coupon} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(coupon)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(coupon)}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {coupon.status === "active" ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(coupon)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? "Atualize as configurações do cupom."
                : "Crie um cupom de desconto para seus clientes."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Code */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-code">
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                id="coupon-code"
                placeholder="Ex: BEMVINDO10"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras, números, _ e -. Será convertido para maiúsculas.
              </p>
            </div>

            {/* Discount */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-discount">
                Desconto (%) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="coupon-discount"
                type="number"
                min={1}
                max={100}
                placeholder="Ex: 10"
                value={form.discountPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountPercent: e.target.value }))
                }
              />
            </div>

            {/* Max uses */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-maxuses">
                Limite de usos{" "}
                <span className="text-muted-foreground text-xs">
                  (deixe em branco para ilimitado)
                </span>
              </Label>
              <Input
                id="coupon-maxuses"
                type="number"
                min={1}
                placeholder="Ex: 100"
                value={form.maxUses}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxUses: e.target.value }))
                }
              />
            </div>

            {/* Expiry */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-expires">
                Validade{" "}
                <span className="text-muted-foreground text-xs">
                  (deixe em branco para sem validade)
                </span>
              </Label>
              <Input
                id="coupon-expires"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiresAt: e.target.value }))
                }
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Cupom ativo</p>
                <p className="text-xs text-muted-foreground">
                  Clientes poderão usar este cupom
                </p>
              </div>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(checked) =>
                  setForm((f) => ({
                    ...f,
                    status: checked ? "active" : "inactive",
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCoupon ? "Salvar alterações" : "Criar cupom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir cupom</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cupom{" "}
              <code className="font-mono font-bold">{deleteTarget?.code}</code>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
