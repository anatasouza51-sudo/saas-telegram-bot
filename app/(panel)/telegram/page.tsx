import { requireCapability } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TelegramForm } from "@/components/settings/telegram-form"
import { getSettings } from "@/app/actions/settings"
import { getAppBaseUrl } from "@/lib/urls"

export default async function TelegramPage() {
  const user = await requireCapability("telegram.manage")
  const saved = await getSettings(user.storeId, [
    "telegram.botToken",
    "telegram.adminIds",
  ])
  const webhookUrl = `${getAppBaseUrl()}/api/telegram/webhook/${user.storeId}`
  const botConfigured = Boolean(saved["telegram.botToken"])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Telegram Bot"
        description="Conecte o bot da sua loja para vender e entregar produtos automaticamente no Telegram."
      />

      <Card>
        <CardHeader>
          <CardTitle>Configurações do bot</CardTitle>
          <CardDescription>
            Informe o token do seu bot (@BotFather), defina os administradores e
            registre o webhook exclusivo da sua loja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TelegramForm
            initial={{
              botToken: saved["telegram.botToken"] ?? "",
              adminIds: saved["telegram.adminIds"] ?? "",
            }}
            webhookUrl={webhookUrl}
            botConfigured={botConfigured}
          />
        </CardContent>
      </Card>
    </div>
  )
}
