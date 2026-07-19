import { ProductsViewRefactored } from "@/components/products/products-view-refactored"
import { listProductsAdvanced, getProductStats, listCategories } from "@/app/actions/products-refactored"
import { requireCapability } from "@/lib/session"

export default async function ProductsPage() {
  await requireCapability("products.manage")
  const [products, categories, stats] = await Promise.all([
    listProductsAdvanced(),
    listCategories(),
    getProductStats(),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Title removed for cleaner UI */}
      <ProductsViewRefactored products={products} categories={categories} stats={stats} />
    </div>
  )
}
