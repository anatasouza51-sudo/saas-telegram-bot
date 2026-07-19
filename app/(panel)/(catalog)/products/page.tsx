import { ProductsViewRefactored } from "@/components/products/products-view-refactored"
import { listProductsAdvanced, getProductStats } from "@/app/actions/products-refactored"
import { listCategories } from "@/app/actions/products"
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
        <p className="text-muted-foreground mt-1">Gerencie seus produtos digitais com facilidade</p>
      </div>
      <ProductsViewRefactored products={products} categories={categories} stats={stats} />
    </div>
  )
}
