"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Package } from "lucide-react"
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
  blue: { accent: "text-blue-400", bg: "from-blue-500/10 to-blue-500/5" },
  green: { accent: "text-emerald-400", bg: "from-emerald-500/10 to-emerald-500/5" },
  yellow: { accent: "text-amber-400", bg: "from-amber-500/10 to-amber-500/5" },
  purple: { accent: "text-purple-400", bg: "from-purple-500/10 to-purple-500/5" },
  pink: { accent: "text-pink-400", bg: "from-pink-500/10 to-pink-500/5" },
}

export const TopProductsSection = memo(({
  products,
  title = "Produtos em Destaque",
}: TopProductsSectionProps) => {
  if (products.length === 0) {
    return (
      <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
        <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] backdrop-blur-sm">
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">
            Nenhum produto cadastrado
          </CardDescription>
        </CardHeader>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-dashboard-text-muted/30" />
          </div>
          <p className="text-sm text-dashboard-text-muted">Seus produtos aparecerão aqui</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] backdrop-blur-sm flex flex-row items-center justify-between">
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
                  "p-5 hover:bg-gradient-to-br transition-all duration-300 group backdrop-blur-sm border-0",
                  colors.bg
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shrink-0",
                      "bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md",
                      colors.accent
                    )}>
                      {product.icon}
                    </div>
                    {product.stock !== undefined && (
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg",
                        product.stock > 10 ? "text-emerald-400 bg-emerald-500/10" : 
                        product.stock > 0 ? "text-amber-400 bg-amber-500/10" : 
                        "text-rose-400 bg-rose-500/10",
                        "border border-white/10 backdrop-blur-sm"
                      )}>
                        {product.stock > 0 ? `${product.stock} em estoque` : "Sem estoque"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-dashboard-text line-clamp-2">
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      {product.category && (
                        <p className="text-[10px] text-dashboard-text-muted truncate">
                          {product.category}
                        </p>
                      )}
                      {product.price !== undefined && (
                        <p className="text-xs font-bold text-dashboard-accent ml-auto">
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
