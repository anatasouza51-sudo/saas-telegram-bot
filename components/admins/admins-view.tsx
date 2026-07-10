"use client"

import { useState, useTransition } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles"
import { formatDateTime } from "@/lib/format"
import { createAdmin, updateAdminRole, deleteAdmin } from "@/app/actions/admins"
import { toast } from "sonner"
import { MoreHorizontal, Plus, UserPlus } from "lucide-react"

type Admin = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
}

const roleItems = Object.fromEntries(
  ROLES.map((r) => [r, ROLE_LABELS[r]]),
) as Record<string, string>

export function AdminsView({
  admins,
  currentUserId,
}: {
  admins: Admin[]
  currentUserId: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("support")
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!name || !email || password.length < 8) {
      toast.error("Preencha todos os campos (senha com 8+ caracteres).")
      return
    }
    startTransition(async () => {
      const res = await createAdmin({ name, email, password, role })
      if (res.ok) {
        toast.success("Administrador criado")
        setOpen(false)
        setName("")
        setEmail("")
        setPassword("")
        setRole("support")
      } else {
        toast.error(res.error)
      }
    })
  }

  function changeRole(id: string, newRole: Role) {
    startTransition(async () => {
      const res = await updateAdminRole(id, newRole)
      if (res.ok) toast.success("Permissão atualizada")
      else toast.error(res.error)
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteAdmin(id)
      if (res.ok) toast.success("Administrador removido")
      else toast.error(res.error)
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Administradores ({admins.length})</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="h-4 w-4" /> Novo administrador
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo administrador</DialogTitle>
              <DialogDescription>
                Crie uma conta e defina o nível de permissão.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="a-name">Nome</Label>
                <Input
                  id="a-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="a-email">Email</Label>
                <Input
                  id="a-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="a-pass">Senha</Label>
                <Input
                  id="a-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Permissão</Label>
                <Select
                  items={roleItems}
                  value={role}
                  onValueChange={(v) => setRole(v as Role)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={pending}>
                <UserPlus className="h-4 w-4" />
                {pending ? "Criando..." : "Criar administrador"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.name}
                    {a.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        a.role === "admin"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {ROLE_LABELS[a.role as Role] ?? a.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(a.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        {ROLES.filter((r) => r !== a.role).map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => changeRole(a.id, r)}
                          >
                            Definir como {ROLE_LABELS[r]}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={a.id === currentUserId}
                          onClick={() => remove(a.id)}
                        >
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
