import { requireCapability } from "@/lib/session"
import { TelegramForm as TelegramForm } from "@/components/settings/telegram-form"
import { StoreCustomizationForm } from "@/components/settings/store-customization-form"
import { CatalogButtonsForm } from "@/components/settings/catalog-buttons-form"
import { getSettings } from "@/lib/settings"
import { parseCatalogConfig } from "@/lib/catalog-config"
import { getAppBaseUrl } from "@/lib/urls"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"
import { getBotPreview } from "@/app/actions/tg-preview"

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
    <div className="flex min-w-0 w-full max-w-full flex-col gap-6 overflow-x-clip p-0">
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

      <StoreCustomizationForm
        initial={{
          welcomeMessage: saved["store.welcomeMessage"] ?? "",
          welcomeImageUrl: saved["store.welcomeImageUrl"] ?? "",
        }}
      />

      <CatalogButtonsForm
        initial={parseCatalogConfig(saved["catalog.config"])}
      />
    </div>
  )
}
