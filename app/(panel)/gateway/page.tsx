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
import { getOrCreateWebhookSecret } from "@/lib/webhook-secrets"
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

  const saved = await safeLoad(
    "getSettings",
    () => getSettings(user.storeId, ["veopag.publicKey", "veopag.secretKey", "pix.config"]),
    {} as Record<string, string | null>
  )

  const pixConfig = parsePixConfig(saved["pix.config"])
  const hasSecretKey = Boolean(saved["veopag.secretKey"])
  
  const webhookSecret = await safeLoad(
    "getOrCreateWebhookSecret",
    () => getOrCreateWebhookSecret(user.storeId, "veopag"),
    "error_fallback"
  )
  
  const webhookUrl = `${getAppBaseUrl()}/api/veopag/webhook/${user.storeId}/${webhookSecret}`
  // Ocultamos parte do segredo para exibição no frontend para evitar vazamento visual/log
  const maskedWebhookUrl = `${getAppBaseUrl()}/api/veopag/webhook/${user.storeId}/••••••••`

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Credenciais da VeoPag</CardTitle>
          <CardDescription>
            Informe as chaves da sua conta VeoPag e configure o webhook exclusivo
            da sua loja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GatewayForm
            initial={{
              publicKey: saved["veopag.publicKey"] ?? "",
              hasSecretKey,
            }}
            webhookUrl={webhookUrl}
            maskedWebhookUrl={maskedWebhookUrl}
          />
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
