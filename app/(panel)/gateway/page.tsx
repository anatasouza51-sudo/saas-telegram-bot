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

  // Apenas o VeoPag está integrado ao fluxo de cobrança atual.
  const gatewayProviders = [
    { id: "veopag", name: "VeoPag", logo: "/assets/logos/veopag.webp", enabled: true },
  ]

  const futureGateways = [
    "Mercado Pago",
    "Stripe",
    "Asaas",
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
    <div className="flex min-w-0 w-full flex-col gap-6 p-3 md:p-6">
      <Card className="border-dashboard-border/30 bg-dashboard-card">
        <CardHeader className="px-4 py-5 md:px-6">
          <CardTitle className="text-xl md:text-2xl font-black tracking-tight">Gateways</CardTitle>
          <CardDescription className="text-xs md:text-sm text-dashboard-text-muted">
            Configure o gateway conectado à sua operação e personalize a experiência de pagamento PIX.
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

      <Card className="border-dashed border-dashboard-border/60 bg-dashboard-surface/40">
        <CardHeader className="px-4 py-4 md:px-6">
          <CardTitle className="text-base font-bold">Próximas integrações</CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted">
            Novos provedores poderão ser habilitados futuramente. Eles ainda não processam pagamentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 px-4 pb-5 md:px-6">
          {futureGateways.map((name) => (
            <span key={name} className="rounded-full border border-dashboard-border/60 bg-dashboard-bg/40 px-3 py-1.5 text-xs font-semibold text-dashboard-text-muted">
              {name} · em breve
            </span>
          ))}
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
