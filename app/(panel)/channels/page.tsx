import { PageHeader } from "@/components/page-header"
import { ChannelsView } from "@/components/channels/channels-view"
import { listChannels } from "@/app/actions/tg-channels"
import { getStoreTelegram } from "@/lib/tg/config"
import { requireCapability } from "@/lib/session"

export default async function ChannelsPage() {
  const user = await requireCapability("posts.manage")
  const [channels, tg] = await Promise.all([
    listChannels(),
    getStoreTelegram(user.storeId),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Grupos & Canais"
        description="Cadastre destinos, valide as permissões do bot e teste a conexão."
      />
      <ChannelsView channels={channels} botConfigured={Boolean(tg.token)} />
    </div>
  )
}
