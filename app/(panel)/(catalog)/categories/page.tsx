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

export default async function CategoriesPage() {
  await requireCapability("products.manage")
  const [categories, support] = await Promise.all([
    listCategoriesDetailed(),
    getSupportConfig(),
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
