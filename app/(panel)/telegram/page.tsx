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
import { TelegramForm } from "@/components/settings/telegram-form"
import { getSettings } from "@/app/actions/settings"
import { telegramConfig, maskSecret } from "@/lib/integrations"

export default async function TelegramPage() {
  await requireCapability("telegram.manage")
  const saved = await getSettings(["telegram.webhookUrl", "telegram.adminIds"])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Telegram Bot"
        description="Configure a integração com a Telegram Bot API para o bot cliente e administrativo."
      />

      <Card>
        <CardHeader>
          <CardTitle>Credenciais (variáveis de ambiente)</CardTitle>
          <CardDescription>
            Tokens são armazenados exclusivamente como variáveis de ambiente
            seguras e nunca ficam expostos no código ou no navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SecretRow
            label="Token do Bot"
            envVar="TELEGRAM_BOT_TOKEN"
            masked={maskSecret(telegramConfig.botToken)}
            configured={telegramConfig.isConfigured}
          />
          <SecretRow
            label="Segredo do Webhook"
            envVar="TELEGRAM_WEBHOOK_SECRET"
            masked={maskSecret(telegramConfig.webhookSecret)}
            configured={Boolean(telegramConfig.webhookSecret)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações do bot</CardTitle>
          <CardDescription>
            Defina o webhook e os administradores autorizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TelegramForm
            initial={{
              webhookUrl: saved["telegram.webhookUrl"] ?? "",
              adminIds: saved["telegram.adminIds"] ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
