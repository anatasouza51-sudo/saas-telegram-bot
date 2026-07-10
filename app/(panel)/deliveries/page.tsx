import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { DeliveriesView } from "@/components/deliveries/deliveries-view"
import { getDeliveries } from "@/lib/queries/records"

export default async function DeliveriesPage() {
  const user = await requireCapability("orders.view")
  const deliveries = await getDeliveries(user.storeId)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Entregas"
        description="Registro de todos os produtos digitais entregues automaticamente."
      />
      <DeliveriesView deliveries={deliveries} />
    </div>
  )
}
