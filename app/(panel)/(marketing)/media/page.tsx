import { requireCapability } from "@/lib/session"
import { MediaLibrary } from "@/components/media/media-library"
import { listMedia, listFolders } from "@/app/actions/tg-media"
import { getStoreTelegram } from "@/lib/tg/config"

export default async function MediaPage() {
  const user = await requireCapability("posts.manage")
  const [media, folders, tg] = await Promise.all([
    listMedia({ folderId: null }),
    listFolders(),
    getStoreTelegram(user.storeId),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <MediaLibrary
        initialMedia={media}
        folders={folders}
        cdnReady={Boolean(tg.client && tg.cdnChatId)}
      />
    </div>
  )
}
