import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { can } from "@/lib/roles"
import { getStoreTelegram } from "@/lib/tg/config"
import { db } from "@/lib/db"
import { telegramMedia } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import type { TelegramMediaKind } from "@/lib/telegram"
import { logActivity } from "@/lib/log"

export const runtime = "nodejs"
// Telegram bot API allows up to 50MB for bot uploads.
const MAX_BYTES = 50 * 1024 * 1024

// Maps a MIME type to the Telegram send method / media kind we should use.
function kindFor(mime: string, forceDocument: boolean): TelegramMediaKind {
  if (forceDocument) return "document"
  if (mime.startsWith("image/gif")) return "animation"
  if (mime.startsWith("image/")) return "photo"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  return "document"
}

export async function POST(req: Request) {
  // AuthN + AuthZ: only authenticated users with posts.manage may upload.
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  if (!can(user.role, "posts.manage")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const { client, cdnChatId } = await getStoreTelegram(user.storeId)
  if (!client) {
    return NextResponse.json(
      { error: "Configure o token do bot em Telegram Bot antes de enviar mídias." },
      { status: 400 },
    )
  }
  if (!cdnChatId) {
    return NextResponse.json(
      { error: "Configure o Grupo/Canal CDN em Telegram Bot antes de enviar mídias." },
      { status: 400 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }

  const file = form.get("file")
  const forceDocument = form.get("asDocument") === "true"
  const folderId = form.get("folderId")
    ? Number(form.get("folderId"))
    : null

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo excede o limite de 50MB do Telegram." },
      { status: 413 },
    )
  }

  const kind = kindFor(file.type || "", forceDocument)
  const buffer = Buffer.from(await file.arrayBuffer())

  // Push the bytes to the private CDN chat; Telegram returns a reusable file_id.
  const result = await client.uploadMedia(cdnChatId, kind, {
    data: buffer,
    filename: file.name || "arquivo",
    mimeType: file.type || undefined,
  })

  if (!result.ok || !result.media) {
    return NextResponse.json(
      { error: result.description ?? "Falha ao enviar para o Telegram" },
      { status: 502 },
    )
  }

  const m = result.media

  // Dedupe: never store the same physical file twice for a store.
  if (m.fileUniqueId) {
    const existing = await db
      .select()
      .from(telegramMedia)
      .where(
        and(
          eq(telegramMedia.ownerId, user.storeId),
          eq(telegramMedia.fileUniqueId, m.fileUniqueId),
        ),
      )
      .limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ media: existing[0], deduped: true })
    }
  }

  const [row] = await db
    .insert(telegramMedia)
    .values({
      ownerId: user.storeId,
      folderId: folderId && !Number.isNaN(folderId) ? folderId : null,
      fileId: m.fileId,
      fileUniqueId: m.fileUniqueId,
      type: m.type,
      fileName: m.fileName,
      mimeType: m.mimeType,
      fileSize: m.fileSize,
      width: m.width,
      height: m.height,
      duration: m.duration,
      thumbFileId: m.thumbFileId,
      uploadedBy: user.id,
      uploadedByName: user.name,
    })
    .returning()

  await logActivity({
    storeId: user.storeId,
    actor: { id: user.id, name: user.name },
    action: `Enviou mídia "${m.fileName ?? m.type}" para o CDN`,
    category: "posts",
  })

  return NextResponse.json({ media: row })
}
