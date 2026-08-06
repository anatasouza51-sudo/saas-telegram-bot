import { memo } from "react"
import { Users } from "lucide-react"
import { motion } from "framer-motion"
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

const getInitials = (name: string) => {
  if (!name) return "??"
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const avatarColors = [
  "from-pink-500 to-pink-600",
  "from-purple-500 to-purple-600",
  "from-emerald-500 to-emerald-600",
  "from-amber-500 to-amber-600",
  "from-blue-500 to-blue-600",
  "from-rose-500 to-rose-600",
]

export const TopCustomers = memo(({
  customers,
  title = "Principais Clientes",
}: TopCustomersProps) => {
  if (!customers || customers.length === 0) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">{title}</h3>
            <p className="text-xs text-dashboard-text-muted">Seus clientes aparecerão aqui</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center mb-3">
            <Users className="w-4 h-4 text-dashboard-text-muted/30" />
          </div>
          <p className="text-xs text-dashboard-text-muted">Comece a vender para ver seus clientes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300 hover:border-dashboard-border-active">
      {/* Ambient glow */}
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-gradient-to-br from-blue-500/[0.05] to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-dashboard-text-muted">{customers.length} cliente{customers.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="relative flex flex-wrap gap-4">
        {customers.map((customer, index) => {
          const spent = typeof customer.totalSpent === "string"
            ? Number.parseFloat(customer.totalSpent)
            : (customer.totalSpent || 0)

          return (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-colors group cursor-pointer"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white transition-transform duration-300 group-hover:scale-105 shrink-0",
                `bg-gradient-to-br ${avatarColors[index % avatarColors.length]}`
              )}>
                {customer.avatar ? (
                  <img
                    src={customer.avatar}
                    alt={customer.name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  getInitials(customer.name || "Cliente")
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-dashboard-text truncate">
                  {(customer.name || "Cliente").split(" ")[0]}
                </p>
                <div className="flex items-center gap-2">
                  {customer.orderCount !== undefined && (
                    <span className="text-[10px] text-dashboard-text-muted">
                      {customer.orderCount} compra{customer.orderCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-dashboard-accent">
                    R$ {spent.toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
})

TopCustomers.displayName = "TopCustomers"
