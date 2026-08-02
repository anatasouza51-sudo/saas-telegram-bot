import { requireCapability } from "@/lib/session"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CatalogButtonsForm } from "@/components/settings/catalog-buttons-form"
import { getSettings } from "@/lib/settings"
import { parseCatalogConfig } from "@/lib/catalog-config"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function CatalogButtonsPage() {
  let user
  try {
    user = await requireCapability("posts.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/catalog-buttons" />
  }

  const saved = await safeLoad(
    "getSettings",
    () => getSettings(user.storeId, ["catalog.config"]),
    {} as Record<string, string | null>
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Botões do Catálogo</CardTitle>
          <CardDescription>
            Personalize os nomes e emojis dos botões de compra, cupom e voltar que aparecem no bot Telegram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CatalogButtonsForm
            initial={parseCatalogConfig(saved["catalog.config"])}
          />
        </CardContent>
      </Card>
    </div>
  )
}
