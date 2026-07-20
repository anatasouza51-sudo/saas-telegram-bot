import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { can } from "@/lib/roles"
import { getStoreTelegram } from "@/lib/tg/config"
import { getFileUrl } from "@/lib/tg/file-url-cache"
import { db } from "@/lib/db"
import { telegramMedia } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export const runtime = "nodejs"

// Streams a stored media item's bytes to authenticated admins. The Telegram
// file_id and bot token never reach the browser: the browser only ever sees
// this same-origin, session-guarded URL (/api/tg/media/:id).
//
// The resolved download URL from `getFile` is cached per-instance (~50 min
// TTL) to avoid redundant Telegram API calls for repeated previews.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user || !can(user.role, "posts.manage")) {
    return new NextResponse("Não autorizado", { status: 401 })
  }

  const { id } = await params
  const mediaId = Number(id)
  if (Number.isNaN(mediaId)) {
    return new NextResponse("ID inválido", { status: 400 })
  }

  // Scope to the caller's store — prevents cross-tenant access (IDOR).
  const [row] = await db
    .select()
    .from(telegramMedia)
    .where(
      and(
        eq(telegramMedia.id, mediaId),
        eq(telegramMedia.ownerId, user.storeId),
      ),
    )
    .limit(1)

  if (!row) return new NextResponse("Não encontrado", { status: 404 })

  const { client } = await getStoreTelegram(user.storeId)
  if (!client) return new NextResponse("Bot não configurado", { status: 400 })

  // Prefer the lightweight thumbnail when present (faster gallery loads).
  const targetFileId = row.thumbFileId ?? row.fileId
  const url = await getFileUrl(client, targetFileId)
  if (!url) {
    // Files over 20MB can't be fetched via getFile; that's expected.
    return new NextResponse("Pré-visualização indisponível", { status: 415 })
  }

  const upstream = await fetch(url)
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Falha ao carregar", { status: 502 })
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      // Private: tied to the admin's session, so don't cache in shared caches.
      "Cache-Control": "private, max-age=3600",
    },
  })
}
