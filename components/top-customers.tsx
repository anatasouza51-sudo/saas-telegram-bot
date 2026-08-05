"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Customer {
  id: string
  name: string
  avatar?: string
  totalSpent?: number
  orderCount?: number
}

interface TopCustomersProps {
  customers: Customer[]
  title?: string
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const colors = [
  "bg-pink-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-blue-500",
  "bg-rose-500",
]

export const TopCustomers = memo(({
  customers,
  title = "Principais Clientes",
}: TopCustomersProps) => {
  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01]">
        <div>
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">
            {customers.length} cliente{customers.length !== 1 ? "s" : ""}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          {customers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black text-white transition-transform group-hover:scale-110",
                colors[index % colors.length]
              )}>
                {customer.avatar ? (
                  <img 
                    src={customer.avatar} 
                    alt={customer.name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  getInitials(customer.name)
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-dashboard-text truncate max-w-[80px]">
                  {customer.name.split(" ")[0]}
                </p>
                {customer.orderCount !== undefined && (
                  <p className="text-[10px] text-dashboard-text-muted truncate max-w-[80px]">
                    {customer.orderCount} compra{customer.orderCount !== 1 ? "s" : ""}
                  </p>
                )}
                {customer.totalSpent !== undefined && (
                  <p className="text-[10px] font-bold text-dashboard-accent mt-1">
                    R$ {customer.totalSpent.toFixed(2)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

TopCustomers.displayName = "TopCustomers"
