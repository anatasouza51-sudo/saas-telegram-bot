import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { can } from "@/lib/roles"
import { getStoreTelegram } from "@/lib/tg/config"
import { db } from "@/lib/db"
import { telegramMedia } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import type { TelegramMediaKind } from "@/lib/telegram"
import { sanitizeFileName } from "@/lib/validation"
import { logActivity } from "@/lib/log"
import { encrypt } from "@/lib/crypto"
import sharp from "sharp"
import { randomBytes } from "node:crypto"

export const runtime = "nodejs"
// Telegram bot API allows up to 50MB for bot uploads.
const MAX_BYTES = 50 * 1024 * 1024

// Allowed MIME type prefixes — block executables, scripts, and dangerous types.
const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
]
const BLOCKED_MIME_PREFIXES = [
  "application/javascript",
  "application/x-sh",
  "application/x-executable",
  "application/vnd.ms-excel",
]

/**
 * Basic magic-byte check for common file types.
 * Returns the detected MIME or null if unrecognized.
 */
function detectMimeType(buf: Buffer): string | null {
  if (buf.length < 4) return null
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png"
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg"
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif"
  // WebP: RIFF .... WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf.length > 12 && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp"
  // MP4: .... ftyp
  if (buf.length > 8 && buf.toString("ascii", 4, 8) === "ftyp") return "video/mp4"
  // PDF: %PDF-
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf"
  return null
}

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
  try {
    return await handleUpload(req)
  } catch (err: any) {
    console.error("[upload] Unhandled error:", {
      message: err?.message ?? "unknown",
      stack: err?.stack?.split("\n").slice(0, 3).join("\n"),
      name: err?.constructor?.name,
    })
    // Always return JSON so the client can parse it.
    return NextResponse.json(
      { error: err?.message ?? "Erro inesperado no servidor" },
      { status: 500 },
    )
  }
}

async function handleUpload(req: Request) {
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
  // Validate MIME type against whitelist; block dangerous types.
  const declaredMime = (file.type || "").toLowerCase()
  const isBlocked = BLOCKED_MIME_PREFIXES.some((p) => declaredMime.startsWith(p))
  if (isBlocked) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 })
  }
  console.log(`[upload] Receiving file: ${file.name} (${file.size} bytes, ${declaredMime})`)
  const buffer = Buffer.from(await file.arrayBuffer())
  // Magic-byte detection for images — verify the actual content matches the claim.
  const detected = detectMimeType(buffer)
  if (declaredMime.startsWith("image/") && detected && !detected.startsWith("image/")) {
    return NextResponse.json({ error: "Conteúdo não corresponde à extensão declarada" }, { status: 400 })
  }
  const finalMime = detected ?? declaredMime
  const kind = kindFor(finalMime, forceDocument)
  console.log(`[upload] Detected kind: ${kind}, MIME: ${finalMime}`)
  // Zero Trust: Re-processar imagens para remover metadados e garantir integridade
  let processedBuffer = buffer
  let finalFileName = sanitizeFileName(file.name)
  // Gerar nome interno seguro e imprevisível
  const extension = finalFileName.split(".").pop() || "bin"
  const secureName = `${randomBytes(16).toString("hex")}.${extension}`
  if (finalMime.startsWith("image/") && !forceDocument && kind !== "animation") {
    try {
      // Sharp decodifica e re-encoda a imagem, removendo metadados EXIF
      processedBuffer = await sharp(buffer)
        .rotate() // Auto-orientação baseada em EXIF antes de remover
        .toBuffer()
      console.log(`[upload] Image re-encoded and metadata stripped for ${file.name}`)
    } catch (err) {
      console.error(`[upload] Image re-encoding failed for ${file.name}:`, err)
      return NextResponse.json({ error: "Arquivo de imagem corrompido ou inválido" }, { status: 400 })
    }
  }
  // Push the bytes to the private CDN chat; Telegram returns a reusable file_id.
  console.log(`[upload] Uploading to Telegram CDN chat ${cdnChatId}...`)
  const result = await client.uploadMedia(cdnChatId, kind, {
    data: processedBuffer,
    filename: secureName,
    mimeType: finalMime,
  })
  console.log(`[upload] Telegram response: ok=${result.ok}, hasMedia=${!!result.media}`)
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
  console.log(`[upload] Inserting into DB: fileUniqueId=${m.fileUniqueId}, type=${m.type}`)
  const [row] = await db
    .insert(telegramMedia)
    .values({
      ownerId: user.storeId,
      folderId: folderId && !Number.isNaN(folderId) ? folderId : null,
      fileId: encrypt(m.fileId),
      fileUniqueId: m.fileUniqueId,
      type: m.type,
      fileName: m.fileName,
      mimeType: m.mimeType,
      fileSize: m.fileSize,
      width: m.width,
      height: m.height,
      duration: m.duration,
      thumbFileId: m.thumbFileId ? encrypt(m.thumbFileId) : null,
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

  console.log(`[upload] Success: media id=${row.id}, fileUniqueId=${m.fileUniqueId}`)
  return NextResponse.json({ media: row })
}
