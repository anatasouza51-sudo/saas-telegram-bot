"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNumber } from "@/lib/format"

export interface FunnelStage {
  label: string
  value: number
  percentage: number
}

export const CheckoutFunnel = memo(({
  stages,
  totalConversion,
}: {
  stages: FunnelStage[]
  totalConversion: number
}) => {
  return (
    <Card className="relative overflow-hidden bg-blue-950/20 border border-blue-500/10 hover:border-purple-500/20 transition-all duration-300 shadow-xl backdrop-blur-sm h-full">
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" 
          />
          FUNIL DE CHECKOUT
        </CardTitle>
        <CardDescription>Jornada completa do checkout</CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const width = (stage.value / (stages[0]?.value || 1)) * 100
            const isLast = index === stages.length - 1
            
            return (
              <div key={stage.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground uppercase tracking-wider font-medium">
                    {stage.label}
                  </span>
                  <span className="text-white font-bold">{formatNumber(stage.value)}</span>
                </div>
                
                <div className="relative h-10 bg-white/5 rounded-lg overflow-hidden border border-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 1, delay: 0.5 + (index * 0.2), ease: "easeOut" }}
                    className={`h-full rounded-lg flex items-center justify-end pr-3 ${
                      index % 2 === 0
                        ? "bg-gradient-to-r from-blue-600/20 to-blue-500/40"
                        : "bg-gradient-to-r from-purple-600/20 to-purple-500/40"
                    }`}
                  >
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.5 + (index * 0.2) }}
                      className="text-xs font-semibold text-white"
                    >
                      {stage.percentage.toFixed(1)}%
                    </motion.span>
                  </motion.div>
                </div>

                {!isLast && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 + (index * 0.2) }}
                    className="flex items-center justify-center py-1"
                  >
                    <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <span className="text-red-400/70">▼</span> {((1 - stages[index + 1].value / stage.value) * 100).toFixed(1)}% de queda
                    </div>
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="mt-6 pt-4 border-t border-white/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Conversão Geral
            </span>
            <div className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {totalConversion.toFixed(1)}%
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
})
CheckoutFunnel.displayName = "CheckoutFunnel"
