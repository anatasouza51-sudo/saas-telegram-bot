"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNumber } from "@/lib/format"

export interface FunnelStage {
  label: string
  value: number
  percentage: number
}

export function CheckoutFunnel({
  stages,
  totalConversion,
}: {
  stages: FunnelStage[]
  totalConversion: number
}) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-950/40 via-purple-950/40 to-blue-950/40 border border-blue-500/20 hover:border-purple-500/30 transition-colors shadow-2xl shadow-purple-900/20">
      {/* Glow effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse" />
          FUNIL DE CHECKOUT
        </CardTitle>
        <CardDescription>Jornada completa do checkout</CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Funnel visualization */}
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
                
                {/* Funnel bar */}
                <div className="relative h-10 bg-white/5 rounded-lg overflow-hidden border border-white/10">
                  <div
                    className={`h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3 ${
                      index % 2 === 0
                        ? "bg-gradient-to-r from-blue-600/30 to-blue-400/20"
                        : "bg-gradient-to-r from-purple-600/30 to-purple-400/20"
                    }`}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-xs font-semibold text-white drop-shadow-lg">
                      {stage.percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Glow effect */}
                  <div
                    className={`absolute inset-0 rounded-lg pointer-events-none ${
                      index % 2 === 0
                        ? "shadow-[inset_0_0_10px_rgba(0,217,255,0.1)]"
                        : "shadow-[inset_0_0_10px_rgba(178,75,243,0.1)]"
                    }`}
                  />
                </div>

                {/* Drop indicator */}
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

        {/* Total conversion */}
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
}
