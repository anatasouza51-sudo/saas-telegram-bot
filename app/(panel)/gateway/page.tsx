import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
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

export default async function GatewayPage() {
  const user = await requireCapability("gateway.manage")
  const saved = await getSettings(user.storeId, [
    "veopag.publicKey",
    "veopag.secretKey",
    "pix.config",
  ])
  const pixConfig = parsePixConfig(saved["pix.config"])
  // The secret key is never sent to the client — only whether one is stored.
  const hasSecretKey = Boolean(saved["veopag.secretKey"])
  // The authenticated owner needs their own signed webhook URL to paste into
  // VeoPag. The embedded secret authenticates inbound callbacks.
  const webhookSecret = await getOrCreateWebhookSecret(user.storeId, "veopag")
  const webhookUrl = `${getAppBaseUrl()}/api/veopag/webhook/${user.storeId}/${webhookSecret}`

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Gateway de Pagamento — VeoPag"
        description="Conecte sua conta VeoPag para gerar cobranças PIX e receber confirmações automáticas."
      />

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
