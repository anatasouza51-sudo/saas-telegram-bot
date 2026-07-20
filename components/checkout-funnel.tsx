"use client"

import { memo } from "react"
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
    <Card className="relative overflow-hidden bg-blue-950/20 border border-blue-500/10 hover:border-purple-500/20 transition-colors shadow-xl">
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
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
                  <div
                    className={`h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3 ${
                      index % 2 === 0
                        ? "bg-blue-600/30"
                        : "bg-purple-600/30"
                    }`}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-xs font-semibold text-white">
                      {stage.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {!isLast && (
                  <div className="flex items-center justify-center py-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      ▼ {((1 - stages[index + 1].value / stage.value) * 100).toFixed(1)}% de queda
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Conversão Geral
            </span>
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {totalConversion.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
CheckoutFunnel.displayName = "CheckoutFunnel"
