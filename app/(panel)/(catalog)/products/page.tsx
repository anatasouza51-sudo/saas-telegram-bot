import { ProductsViewRefactored } from "@/components/products/products-view-refactored"
import { listProductsAdvanced, getProductStats, listCategories } from "@/app/actions/products-refactored"
import { listCoupons } from "@/app/actions/coupons"
import { requireCapability } from "@/lib/session"
import { CouponsView } from "@/components/coupons/coupons-view"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default async function ProductsPage() {
  await requireCapability("products.manage")
  const [products, categories, stats, coupons] = await Promise.all([
    listProductsAdvanced(),
    listCategories(),
    getProductStats(),
    listCoupons(),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="coupons">Cupons</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsViewRefactored products={products} categories={categories} stats={stats} />
        </TabsContent>
        <TabsContent value="coupons" className="mt-6">
          <CouponsView initialCoupons={coupons} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
