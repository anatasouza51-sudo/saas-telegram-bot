import { PageHeader } from "@/components/page-header"
import { StockView } from "@/components/stock/stock-view"
import { listStockSummary } from "@/app/actions/stock"
import { requireCapability } from "@/lib/session"

export default async function StockPage() {
  await requireCapability("stock.manage")
  const summary = await listStockSummary()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Estoque Digital"
        description="Gerencie o estoque individual de cada produto. Cada item é entregue apenas uma vez."
      />
      <StockView summary={summary} />
    </div>
  )
}
