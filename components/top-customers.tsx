"use client"

import { memo } from "react"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface Customer {
  id: string
  name: string
  avatar?: string
  totalSpent?: number | string
  orderCount?: number
}

interface TopCustomersProps {
  customers: Customer[]
  title?: string
}

const getInitials = (name: string) => name.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "??"
const avatarColors = ["from-blue-500 to-cyan-400", "from-violet-500 to-fuchsia-400", "from-emerald-500 to-teal-400", "from-amber-500 to-orange-400", "from-rose-500 to-pink-400"]

export const TopCustomers = memo(({ customers, title = "Principais clientes" }: TopCustomersProps) => {
  return (
    <section className="rounded-[22px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10"><Users className="h-4 w-4 text-violet-400" /></div>
        <div><h3 className="text-sm font-bold text-dashboard-text">{title}</h3><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">{customers.length} cliente{customers.length === 1 ? "" : "s"} em destaque</p></div>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dashboard-border px-4 py-12 text-center"><Users className="mb-3 h-6 w-6 text-dashboard-text-muted/40" /><p className="text-xs text-dashboard-text-muted">Comece a vender para ver seus clientes</p></div>
      ) : (
        <div className="space-y-2">
          {customers.map((customer, index) => {
            const spent = typeof customer.totalSpent === "string" ? Number.parseFloat(customer.totalSpent) : customer.totalSpent || 0
            return (
              <div key={customer.id} className="flex items-center gap-3 rounded-2xl border border-dashboard-border/70 bg-dashboard-bg/45 p-3 transition-colors hover:border-dashboard-border-active hover:bg-dashboard-surface-elevated/60">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br text-[10px] font-black text-white", avatarColors[index % avatarColors.length])}>{customer.avatar ? <img src={customer.avatar} alt={customer.name} className="h-full w-full object-cover" /> : getInitials(customer.name)}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-dashboard-text">{customer.name}</p><p className="mt-1 text-[10px] text-dashboard-text-muted">{customer.orderCount || 0} compra{customer.orderCount === 1 ? "" : "s"}</p></div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-dashboard-accent">R$ {spent.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
})

TopCustomers.displayName = "TopCustomers"
