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
import { MessageCircle } from "lucide-react"

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

      <Card className="overflow-hidden rounded-xl border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70 bg-muted/20">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_14px_rgba(169,201,127,0.12)]">
              <MessageCircle className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Suporte no menu do bot</CardTitle>
              <CardDescription className="mt-1">
                Configure o botão e a mensagem de atendimento exibidos para seus clientes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <SupportConfigForm initial={support} />
        </CardContent>
      </Card>
    </div>
  )
}
