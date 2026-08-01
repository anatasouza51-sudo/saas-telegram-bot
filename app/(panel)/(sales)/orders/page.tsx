import { requireCapability } from "@/lib/session"
import { can } from "@/lib/roles"
import { OrdersView } from "@/components/orders/orders-view"
import { getOrders } from "@/lib/queries/records"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function OrdersPage() {
  let user
  try {
    user = await requireCapability("orders.view")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/orders" />
  }

  const canManage = can(user.role, "orders.manage")
  const orders = await safeLoad("getOrders", () => getOrders(user.storeId), [])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <OrdersView orders={orders} canManage={canManage} />
    </div>
  )
}
