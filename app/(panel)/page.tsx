"use client"

import { useEffect, useState } from "react"
import { MetricCard } from "@/components/metric-card"
import { CheckoutFunnel } from "@/components/checkout-funnel"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  Zap,
  CheckCircle2,
} from "lucide-react"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />
  }

  // Pure static mock data for testing
  const funnelStages = [
    { label: "Checkouts", value: 2314, percentage: 100 },
    { label: "Dados Pessoais", value: 1511, percentage: 65.3 },
    { label: "Método de Pagamento", value: 943, percentage: 40.8 },
    { label: "Isto Gerado", value: 410, percentage: 17.7 },
    { label: "Vendas", value: 243, percentage: 10.5 },
  ]

  return (
    <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          Bem-vindo ao seu <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Novo Painel</span>
        </h1>
        <p className="text-lg text-muted-foreground">Otimizado para performance e clareza</p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <MetricCard
          title="Receita Total"
          value="R$ 127.430,70"
          icon={DollarSign}
          color="blue"
          trend="up"
          trendValue="+16.0%"
        />
        <MetricCard
          title="Total de Vendas"
          value="243"
          icon={ShoppingCart}
          color="purple"
          trend="up"
          trendValue="+12.5%"
        />
        <MetricCard
          title="Taxa de Conversão"
          value="10.5%"
          icon={TrendingUp}
          color="green"
          trend="up"
          trendValue="+2.3%"
        />
        <MetricCard
          title="Clientes Ativos"
          value="1.511"
          icon={Users}
          color="yellow"
          trend="up"
          trendValue="+8.1%"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2">
          <Card className="relative overflow-hidden border-0 bg-blue-950/20 shadow-2xl h-full">
            <CardHeader>
              <CardTitle>Vendas dos Últimos 14 Dias</CardTitle>
              <CardDescription>Visualização em tempo real do faturamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border border-dashed border-blue-500/20 rounded-xl bg-blue-500/5">
                <p className="text-blue-400 font-medium">Gráfico em processamento...</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <CheckoutFunnel stages={funnelStages} totalConversion={10.5} />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
        <MetricCard title="Produtos" value="12" icon={Package} color="blue" />
        <MetricCard title="Estoque Baixo" value="0" icon={AlertTriangle} color="green" />
        <MetricCard title="Aprovados" value="243" icon={CheckCircle2} color="green" />
        <MetricCard title="Pendentes" value="45" icon={Zap} color="yellow" />
        <MetricCard title="Recusados" value="12" icon={AlertTriangle} color="red" />
        <MetricCard title="Vendas Hoje" value="8" icon={TrendingUp} color="purple" />
      </div>

      {/* Footer Info */}
      <div className="text-center text-muted-foreground text-sm border-t border-white/5 pt-8">
        <p>GhostBot v2.5.0 — Sistema de Vendas via Telegram</p>
      </div>
    </div>
  )
}
