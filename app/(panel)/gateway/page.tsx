import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SecretRow } from "@/components/settings/secret-row"
import { GatewayForm } from "@/components/settings/gateway-form"
import { getSettings } from "@/app/actions/settings"
import { veopagConfig, maskSecret } from "@/lib/integrations"

export default async function GatewayPage() {
  await requireCapability("gateway.manage")
  const saved = await getSettings(["veopag.webhookUrl", "veopag.callbackUrl"])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Gateway de Pagamento — VeoPag"
        description="Configure a integração com a VeoPag para gerar cobranças e receber confirmações automáticas."
      />

      <Card>
        <CardHeader>
          <CardTitle>Credenciais (variáveis de ambiente)</CardTitle>
          <CardDescription>
            As chaves da API são armazenadas exclusivamente como variáveis de
            ambiente seguras e nunca ficam expostas no código ou no navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SecretRow
            label="Public Key"
            envVar="VEOPAG_PUBLIC_KEY"
            masked={maskSecret(veopagConfig.publicKey)}
            configured={Boolean(veopagConfig.publicKey)}
          />
          <SecretRow
            label="Secret Key"
            envVar="VEOPAG_SECRET_KEY"
            masked={maskSecret(veopagConfig.secretKey)}
            configured={Boolean(veopagConfig.secretKey)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>URLs de integração</CardTitle>
          <CardDescription>
            Configure estas URLs no painel da VeoPag.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GatewayForm
            initial={{
              webhookUrl: saved["veopag.webhookUrl"] ?? "",
              callbackUrl: saved["veopag.callbackUrl"] ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
