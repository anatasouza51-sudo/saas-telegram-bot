import { memo } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
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
  blue: { accent: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  green: { accent: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  yellow: { accent: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  purple: { accent: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  pink: { accent: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
}

export const TopProductsSection = memo(({
  products,
  title = "Produtos em Destaque",
}: TopProductsSectionProps) => {
  if (products.length === 0) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 shadow-[0_0_14px_rgba(139,92,246,0.18)] flex items-center justify-center">
            <Package className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">{title}</h3>
            <p className="text-xs text-dashboard-text-muted">Nenhum produto cadastrado</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-dashboard-surface-elevated border border-dashboard-border flex items-center justify-center mb-3">
            <Package className="w-4 h-4 text-dashboard-text-muted/30" />
          </div>
          <p className="text-xs text-dashboard-text-muted">Seus produtos aparecerão aqui</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-dashboard-border bg-dashboard-surface p-5 transition-all duration-300 hover:border-dashboard-border-active">
      {/* Ambient glow */}
      <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-gradient-to-br from-amber-500/[0.04] to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 shadow-[0_0_14px_rgba(139,92,246,0.18)] flex items-center justify-center">
            <Package className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dashboard-text uppercase tracking-wider">{title}</h3>
            <p className="text-xs text-dashboard-text-muted">{products.length} produto{products.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Link
          href="/products"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "text-dashboard-accent hover:text-dashboard-accent hover:bg-dashboard-accent/10 gap-2 text-xs font-bold",
          })}
        >
          Ver todos
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((product, index) => {
          const colors = colorMap[product.color]
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300 group cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0",
                    colors.bg,
                    colors.accent,
                    "shadow-[0_0_12px_rgba(139,92,246,0.16)]"
                  )}>
                    {product.icon}
                  </div>
                  {product.stock !== undefined && (
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/[0.06]",
                      product.stock > 10 ? "text-emerald-400 bg-emerald-500/10" :
                      product.stock > 0 ? "text-violet-400 bg-amber-500/10" :
                      "text-rose-400 bg-rose-500/10",
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
    </div>
  )
})

TopProductsSection.displayName = "TopProductsSection"
