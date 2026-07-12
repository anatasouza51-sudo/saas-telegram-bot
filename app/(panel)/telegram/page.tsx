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
import { StoreCustomizationForm } from "@/components/settings/store-customization-form"
import { getSettings } from "@/lib/settings"
import { getAppBaseUrl } from "@/lib/urls"

export default async function TelegramPage() {
  const user = await requireCapability("telegram.manage")
  const saved = await getSettings(user.storeId, [
    "telegram.botToken",
    "telegram.adminIds",
    "store.welcomeMessage",
    "store.welcomeImageUrl",
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
              hasBotToken: botConfigured,
              adminIds: saved["telegram.adminIds"] ?? "",
            }}
            webhookUrl={webhookUrl}
            botConfigured={botConfigured}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalização da loja</CardTitle>
          <CardDescription>
            Edite a mensagem de &quot;bem-vindo à loja&quot; e adicione uma
            imagem que o cliente vê ao iniciar o bot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StoreCustomizationForm
            initial={{
              welcomeMessage: saved["store.welcomeMessage"] ?? "",
              welcomeImageUrl: saved["store.welcomeImageUrl"] ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
