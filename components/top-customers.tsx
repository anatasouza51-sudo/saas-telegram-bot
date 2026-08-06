"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

const colors = [
  "bg-gradient-to-br from-pink-500 to-pink-600",
  "bg-gradient-to-br from-purple-500 to-purple-600",
  "bg-gradient-to-br from-emerald-500 to-emerald-600",
  "bg-gradient-to-br from-amber-500 to-amber-600",
  "bg-gradient-to-br from-blue-500 to-blue-600",
  "bg-gradient-to-br from-rose-500 to-rose-600",
]

export const TopCustomers = memo(({
  customers,
  title = "Principais Clientes",
}: TopCustomersProps) => {
  if (!customers || customers.length === 0) {
    return (
      <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
        <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] backdrop-blur-sm">
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">
            Seus clientes aparecerão aqui
          </CardDescription>
        </CardHeader>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-dashboard-text-muted/30" />
          </div>
          <p className="text-sm text-dashboard-text-muted">Comece a vender para ver seus clientes</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] backdrop-blur-sm">
        <div>
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-wrap gap-4">
          {customers.map((customer, index) => {
            // Garantir que totalSpent seja tratado como número antes de usar .toFixed
            const spent = typeof customer.totalSpent === "string" 
              ? Number.parseFloat(customer.totalSpent) 
              : (customer.totalSpent || 0)
            
            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-xs font-black text-white transition-all duration-300 group-hover:scale-110 shadow-lg",
                  colors[index % colors.length]
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
                <div className="text-center">
                  <p className="text-xs font-bold text-dashboard-text truncate max-w-[90px]">
                    {(customer.name || "Cliente").split(" ")[0]}
                  </p>
                  {customer.orderCount !== undefined && (
                    <p className="text-[10px] text-dashboard-text-muted truncate max-w-[90px]">
                      {customer.orderCount} compra{customer.orderCount !== 1 ? "s" : ""}
                    </p>
                  )}
                  <p className="text-[10px] font-bold text-dashboard-accent mt-1">
                    R$ {spent.toFixed(2)}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})

TopCustomers.displayName = "TopCustomers"
