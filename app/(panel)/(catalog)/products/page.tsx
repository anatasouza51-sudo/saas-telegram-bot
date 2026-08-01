import { ProductsViewRefactored } from "@/components/products/products-view-refactored"
import { listProductsAdvanced, getProductStats, listCategories } from "@/app/actions/products-refactored"
import { listCoupons } from "@/app/actions/coupons"
import { requireCapability } from "@/lib/session"
import { CouponsView } from "@/components/coupons/coupons-view"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function ProductsPage() {
  try {
    await requireCapability("products.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/products" />
  }

  console.log("DEPLOY CHECK: Coupons version 1.0.1 loaded")
  
  const [products, categories, stats, coupons] = await Promise.all([
    safeLoad("listProducts", () => listProductsAdvanced(), []),
    safeLoad("listCategories", () => listCategories(), []),
    safeLoad("getProductStats", () => getProductStats(), { total: 0, active: 0, inactive: 0 }),
    safeLoad("listCoupons", () => listCoupons(), []),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="coupons">Cupons</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsViewRefactored products={products} categories={categories} stats={stats as any} />
        </TabsContent>
        <TabsContent value="coupons" className="mt-6">
          <CouponsView initialCoupons={coupons} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
