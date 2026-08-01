import { StockView } from "@/components/stock/stock-view"
import { listStockSummary } from "@/app/actions/stock"
import { requireCapability } from "@/lib/session"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function StockPage() {
  try {
    await requireCapability("stock.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/stock" />
  }

  const summary = await safeLoad("listStockSummary", () => listStockSummary(), [])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <StockView summary={summary} />
    </div>
  )
}
