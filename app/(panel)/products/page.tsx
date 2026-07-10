import { PageHeader } from "@/components/page-header"
import { ProductsView } from "@/components/products/products-view"
import { listProducts, listCategories } from "@/app/actions/products"
import { requireCapability } from "@/lib/session"

export default async function ProductsPage() {
  await requireCapability("products.manage")
  const [products, categories] = await Promise.all([
    listProducts(),
    listCategories(),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Produtos"
        description="Gerencie seu catálogo de produtos digitais."
      />
      <ProductsView products={products} categories={categories} />
    </div>
  )
}
