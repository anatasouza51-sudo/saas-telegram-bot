import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CategoriesView } from "@/components/categories/categories-view"
import { SupportConfigForm } from "@/components/categories/support-config-form"
import {
  listCategoriesDetailed,
  getSupportConfig,
} from "@/app/actions/categories"
import { requireCapability } from "@/lib/session"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function CategoriesPage() {
  try {
    await requireCapability("products.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/categories" />
  }

  const [categories, support] = await Promise.all([
    safeLoad("listCategoriesDetailed", () => listCategoriesDetailed(), []),
    safeLoad("getSupportConfig", () => getSupportConfig(), null),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <CategoriesView categories={categories} />

      <Card>
        <CardHeader>
          <CardTitle>Categoria de Suporte</CardTitle>
          <CardDescription>
            Configure a opção especial de suporte exibida no menu do bot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupportConfigForm initial={support} />
        </CardContent>
      </Card>
    </div>
  )
}
