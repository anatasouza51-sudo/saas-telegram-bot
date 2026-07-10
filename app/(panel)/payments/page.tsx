import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { OrdersView } from "@/components/orders/orders-view"
import { StatCard } from "@/components/stat-card"
import { getOrders } from "@/lib/queries/records"
import { formatCurrency } from "@/lib/format"
import { CircleDollarSign, CheckCircle2, Clock, XCircle } from "lucide-react"

export default async function PaymentsPage() {
  await requireCapability("payments.view")
  const orders = await getOrders()

  const approved = orders.filter((o) => o.paymentStatus === "approved")
  const pending = orders.filter((o) => o.paymentStatus === "pending")
  const refused = orders.filter((o) => o.paymentStatus === "refused")
  const revenue = approved.reduce((sum, o) => sum + Number(o.amount), 0)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Pagamentos"
        description="Controle financeiro de todos os pagamentos processados pelo gateway."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receita aprovada"
          value={formatCurrency(revenue)}
          icon={CircleDollarSign}
          tone="primary"
        />
        <StatCard
          title="Aprovados"
          value={String(approved.length)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          title="Pendentes"
          value={String(pending.length)}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          title="Recusados"
          value={String(refused.length)}
          icon={XCircle}
          tone="destructive"
        />
      </div>
      <OrdersView orders={orders} />
    </div>
  )
}
