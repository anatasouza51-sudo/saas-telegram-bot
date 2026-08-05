"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  category?: string
  stock?: number
  price?: number
  icon: React.ReactNode
  color: "blue" | "green" | "yellow" | "purple" | "pink"
}

interface TopProductsSectionProps {
  products: Product[]
  title?: string
}

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  yellow: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
}

export const TopProductsSection = memo(({
  products,
  title = "Produtos em Destaque",
}: TopProductsSectionProps) => {
  if (products.length === 0) {
    return null
  }

  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">
            {products.length} produto{products.length !== 1 ? "s" : ""}
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-dashboard-accent hover:text-dashboard-accent hover:bg-dashboard-accent/10 gap-2 text-xs font-bold"
        >
          Ver todos
          <ArrowRight className="w-3 h-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-dashboard-border/30">
          {products.map((product, index) => {
            const colors = colorMap[product.color]
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "p-4 hover:bg-white/[0.02] transition-all group cursor-pointer",
                  colors.bg
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
                      colors.bg,
                      colors.text
                    )}>
                      {product.icon}
                    </div>
                    {product.stock !== undefined && (
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                        product.stock > 10 ? "text-emerald-400" : product.stock > 0 ? "text-amber-400" : "text-rose-400",
                        "bg-white/5"
                      )}>
                        {product.stock} em estoque
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-dashboard-text line-clamp-2">
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between mt-2">
                      {product.category && (
                        <p className="text-[10px] text-dashboard-text-muted">
                          {product.category}
                        </p>
                      )}
                      {product.price !== undefined && (
                        <p className="text-xs font-bold text-dashboard-accent">
                          R$ {product.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})

TopProductsSection.displayName = "TopProductsSection"
