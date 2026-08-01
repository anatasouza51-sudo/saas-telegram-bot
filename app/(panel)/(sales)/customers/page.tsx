import { requireCapability } from "@/lib/session"
import { CustomersView } from "@/components/customers/customers-view"
import { getCustomers } from "@/lib/queries/records"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function CustomersPage() {
  let user
  try {
    user = await requireCapability("customers.view")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/customers" />
  }

  const customers = await safeLoad("getCustomers", () => getCustomers(user.storeId), [])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <CustomersView customers={customers} />
    </div>
  )
}
