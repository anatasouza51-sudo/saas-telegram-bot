import { requireCapability } from "@/lib/session"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TelegramForm as TelegramForm } from "@/components/settings/telegram-form"
import { StoreCustomizationForm } from "@/components/settings/store-customization-form"
import { CatalogButtonsForm } from "@/components/settings/catalog-buttons-form"
import { getSettings } from "@/lib/settings"
import { parseCatalogConfig } from "@/lib/catalog-config"
import { getAppBaseUrl } from "@/lib/urls"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function TelegramPage() {
  let user
  try {
    user = await requireCapability("telegram.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/telegram" />
  }

  const saved = await safeLoad(
    "getSettings",
    () => getSettings(user.storeId, [
      "telegram.botToken",
      "telegram.adminIds",
      "store.welcomeMessage",
      "store.welcomeImageUrl",
      "catalog.config",
    ]),
    {} as Record<string, string | null>
  )

  const webhookUrl = `${getAppBaseUrl()}/api/telegram/webhook/${user.storeId}`
  const botConfigured = Boolean(saved["telegram.botToken"])

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-6 overflow-x-clip p-4 md:p-6">
      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardContent className="min-w-0 pt-6">
          <TelegramForm
            initial={{
              hasBotToken: botConfigured,
              adminIds: saved["telegram.adminIds"] ?? "",
            }}
            webhookUrl={webhookUrl}
            botConfigured={botConfigured}
          />
        </CardContent>
      </Card>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardContent className="min-w-0 pt-6">
          <StoreCustomizationForm
            initial={{
              welcomeMessage: saved["store.welcomeMessage"] ?? "",
              welcomeImageUrl: saved["store.welcomeImageUrl"] ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardContent className="min-w-0 pt-6">
          <CatalogButtonsForm
            initial={parseCatalogConfig(saved["catalog.config"])}
          />
        </CardContent>
      </Card>
    </div>
  )
}
