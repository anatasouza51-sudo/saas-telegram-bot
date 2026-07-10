import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { CustomersView } from "@/components/customers/customers-view"
import { getCustomers } from "@/lib/queries/records"

export default async function CustomersPage() {
  const user = await requireCapability("customers.view")
  const customers = await getCustomers(user.storeId)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Clientes"
        description="Base de clientes captada automaticamente pelo bot do Telegram."
      />
      <CustomersView customers={customers} />
    </div>
  )
}
