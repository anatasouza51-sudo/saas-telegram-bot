import { requireCapability } from "@/lib/session"
import { TelegramForm } from "@/components/settings/telegram-form"
import { StoreCustomizationForm } from "@/components/settings/store-customization-form"
import { CatalogButtonsForm } from "@/components/settings/catalog-buttons-form"
import { getSettings } from "@/lib/settings"
import { parseCatalogConfig } from "@/lib/catalog-config"
import { getAppBaseUrl } from "@/lib/urls"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"
import { getBotPreview } from "@/app/actions/tg-preview"
import { Card, CardContent } from "@/components/ui/card"

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
  const botIdentity = botConfigured
    ? await safeLoad(
        "getBotPreview",
        () => getBotPreview(saved["telegram.botToken"] ?? ""),
        null,
      )
    : null

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-clip">
      <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-3xl border-dashboard-border/70 bg-dashboard-card/80 shadow-[0_18px_70px_rgba(0,0,0,0.16)]">
        <CardContent className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="min-w-0 divide-y divide-dashboard-border/60">
            <TelegramForm
              initial={{
                hasBotToken: botConfigured,
                adminIds: saved["telegram.adminIds"] ?? "",
                botIdentity: botIdentity
                  ? { name: botIdentity.name, username: botIdentity.username, photoUrl: botIdentity.photoUrl }
                  : null,
              }}
              webhookUrl={webhookUrl}
              botConfigured={botConfigured}
            />

            <div className="py-8 sm:py-10">
              <StoreCustomizationForm
                initial={{
                  welcomeMessage: saved["store.welcomeMessage"] ?? "",
                  welcomeImageUrl: saved["store.welcomeImageUrl"] ?? "",
                }}
              />
            </div>

            <div className="pt-8 sm:pt-10">
              <CatalogButtonsForm
                initial={parseCatalogConfig(saved["catalog.config"])}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
