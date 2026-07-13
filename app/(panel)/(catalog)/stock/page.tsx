import { StockView } from "@/components/stock/stock-view"
import { listStockSummary } from "@/app/actions/stock"
import { requireCapability } from "@/lib/session"

export default async function StockPage() {
  await requireCapability("stock.manage")
  const summary = await listStockSummary()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <StockView summary={summary} />
    </div>
  )
}
