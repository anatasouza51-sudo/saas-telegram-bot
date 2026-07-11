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
import { getSettings } from "@/app/actions/settings"
import { getAppBaseUrl } from "@/lib/urls"
import { webhookToken } from "@/lib/webhook-security"

export default async function GatewayPage() {
  const user = await requireCapability("gateway.manage")
  const saved = await getSettings(user.storeId, [
    "veopag.publicKey",
    "veopag.secretKey",
  ])
  const webhookUrl = `${getAppBaseUrl()}/api/veopag/webhook/${user.storeId}?token=${webhookToken(
    "veopag",
    user.storeId,
  )}`

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
            initial={{ publicKey: saved["veopag.publicKey"] ?? "" }}
            secretConfigured={Boolean(saved["veopag.secretKey"])}
            webhookUrl={webhookUrl}
          />
        </CardContent>
      </Card>
    </div>
  )
}
