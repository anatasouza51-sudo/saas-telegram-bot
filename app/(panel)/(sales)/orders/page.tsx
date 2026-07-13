import { requireCapability } from "@/lib/session"
import { can } from "@/lib/roles"
import { OrdersView } from "@/components/orders/orders-view"
import { getOrders } from "@/lib/queries/records"

export default async function OrdersPage() {
  const user = await requireCapability("orders.view")
  const canManage = can(user.role, "orders.manage")
  const orders = await getOrders(user.storeId)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <OrdersView orders={orders} canManage={canManage} />
    </div>
  )
}
