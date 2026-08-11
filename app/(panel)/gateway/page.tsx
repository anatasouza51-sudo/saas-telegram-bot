import { requireCapability } from "@/lib/session"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GatewayForm } from "@/components/settings/gateway-form"
import { PixSettingsForm } from "@/components/settings/pix-settings-form"
import { getSettings } from "@/lib/settings"
import { parsePixConfig } from "@/lib/pix-config"
import { getAppBaseUrl } from "@/lib/urls"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"

export default async function GatewayPage() {
  let user
  try {
    user = await requireCapability("gateway.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/gateway" />
  }

  // Lista de gateways suportados e futuros
  const gatewayProviders = [
    { id: "veopag", name: "VeoPag", logo: "/assets/logos/veopag.webp" },
    { id: "gateway2", name: "Gateway Futuro 1", logo: "/assets/logos/placeholder.svg" },
    { id: "gateway3", name: "Gateway Futuro 2", logo: "/assets/logos/placeholder.svg" },
    { id: "gateway4", name: "Gateway Futuro 3", logo: "/assets/logos/placeholder.svg" },
    { id: "gateway5", name: "Gateway Futuro 4", logo: "/assets/logos/placeholder.svg" },
  ]

  const keysToLoad = [
    "pix.config",
    ...gatewayProviders.flatMap(p => [`${p.id}.publicKey`, `${p.id}.secretKey`])
  ]

  const saved = await safeLoad(
    "getSettings",
    () => getSettings(user.storeId, keysToLoad),
    {} as Record<string, string | null>
  )

  const pixConfig = parsePixConfig(saved["pix.config"])

  return (
    <div className="flex flex-col gap-6 p-3 md:p-6 max-w-4xl mx-auto">
      <Card className="border-dashboard-border/30 bg-dashboard-card">
        <CardHeader className="px-4 py-5 md:px-6">
          <CardTitle className="text-xl md:text-2xl font-black tracking-tight">Gateways</CardTitle>
          <CardDescription className="text-xs md:text-sm text-dashboard-text-muted">
            Gerencie suas integrações de pagamento. Configure as chaves e URLs de webhook para cada provedor.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-6 md:px-6 flex flex-col gap-1">
          {await Promise.all(gatewayProviders.map(async (provider) => {
            const hasSecretKey = Boolean(saved[`${provider.id}.secretKey`])
            
            const maskedWebhookUrl = `${getAppBaseUrl()}/api/${provider.id}/webhook/${user.storeId}/••••••••`

            return (
              <GatewayForm
                key={provider.id}
                provider={provider.id}
                providerName={provider.name}
                logoUrl={provider.logo}
                initial={{
                  publicKey: saved[`${provider.id}.publicKey`] ?? "",
                  hasSecretKey,
                }}
                maskedWebhookUrl={maskedWebhookUrl}
              />
            )
          }))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamento PIX</CardTitle>
          <CardDescription>
            Personalize os textos, os botões e o tempo de expiração exibidos na
            cobrança PIX — no bot do Telegram e na página de pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PixSettingsForm initial={pixConfig} />
        </CardContent>
      </Card>
    </div>
  )
}
