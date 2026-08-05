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
// Vercel serverless body size limit. Must match the MAX_BYTES below.
export const config = {
  bodyParser: {
    sizeLimit: "50mb",
  },
  maxDuration: 60,
}
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

// Helper to always return JSON — prevents Vercel HTML error pages.
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })
}

export async function POST(req: Request) {
  try {
    return await handleUpload(req)
  } catch (err: any) {
    const msg = err?.message ?? "unknown"
    const stack = err?.stack?.split("\n").slice(0, 5).join("\n")
    console.error("[upload] CRITICAL — Unhandled error (full stack):", {
      message: msg,
      stack,
      name: err?.constructor?.name,
    })
    // MUST return JSON — otherwise Vercel/Next.js sends HTML "This page couldn't load".
    return jsonResponse(
      { error: "Erro interno no servidor. Verifique os logs para detalhes." },
      500,
    )
  }
}

async function handleUpload(req: Request) {
  // AuthN + AuthZ: only authenticated users with posts.manage may upload.
  let user
  try {
    user = await getSessionUser()
  } catch (err: any) {
    console.error("[upload] getSessionUser threw:", err)
    return jsonResponse({ error: "Sessão inválida. Recarregue a página." }, 401)
  }

  if (!user) {
    return jsonResponse({ error: "Não autenticado. Faça login novamente." }, 401)
  }
  if (!can(user.role, "posts.manage")) {
    return jsonResponse({ error: "Sem permissão" }, 403)
  }

  // Load Telegram config
  let client, cdnChatId
  try {
    const cfg = await getStoreTelegram(user.storeId)
    client = cfg.client
    cdnChatId = cfg.cdnChatId
  } catch (err: any) {
    console.error("[upload] getStoreTelegram threw:", err)
    return jsonResponse({ error: "Erro ao carregar configuração do Telegram." }, 500)
  }

  if (!client) {
    return jsonResponse(
      { error: "Configure o token do bot em Telegram Bot antes de enviar mídias." },
      400,
    )
  }
  if (!cdnChatId) {
    return jsonResponse(
      { error: "Configure o Grupo/Canal CDN em Telegram Bot antes de enviar mídias." },
      400,
    )
  }

  // Parse form data
  let form: FormData
  try {
    form = await req.formData()
  } catch (err: any) {
    console.error("[upload] formData parsing failed:", err)
    return jsonResponse(
      { error: "Falha ao processar o arquivo. Tente um arquivo menor ou recarregue a página." },
      400,
    )
  }

  const file = form.get("file")
  const forceDocument = form.get("asDocument") === "true"
  const folderId = form.get("folderId")
    ? Number(form.get("folderId"))
    : null

  if (!(file instanceof File)) {
    return jsonResponse({ error: "Arquivo ausente" }, 400)
  }
  if (file.size === 0) {
    return jsonResponse({ error: "Arquivo vazio" }, 400)
  }
  if (file.size > MAX_BYTES) {
    return jsonResponse(
      { error: "Arquivo excede o limite de 50MB do Telegram." },
      413,
    )
  }

  // Validate MIME type against whitelist; block dangerous types.
  const declaredMime = (file.type || "").toLowerCase()
  const isBlocked = BLOCKED_MIME_PREFIXES.some((p) => declaredMime.startsWith(p))
  if (isBlocked) {
    return jsonResponse({ error: "Tipo de arquivo não permitido" }, 400)
  }

  console.log(`[upload] Receiving file: ${file.name} (${file.size} bytes, ${declaredMime})`)

  // Read file into buffer
  let buffer: Buffer
  try {
    buffer = Buffer.from(await file.arrayBuffer())
  } catch (err: any) {
    console.error("[upload] arrayBuffer failed:", err)
    return jsonResponse({ error: "Falha ao ler o arquivo." }, 400)
  }

  // Magic-byte detection for images — verify the actual content matches the claim.
  const detected = detectMimeType(buffer)
  if (declaredMime.startsWith("image/") && detected && !detected.startsWith("image/")) {
    return jsonResponse({ error: "Conteúdo não corresponde à extensão declarada" }, 400)
  }

  const finalMime = detected ?? declaredMime
  const kind = kindFor(finalMime, forceDocument)
  console.log(`[upload] Detected kind: ${kind}, MIME: ${finalMime}`)

  // Zero Trust: Re-process images to remove EXIF metadata.
  let processedBuffer = buffer
  const finalFileName = sanitizeFileName(file.name)
  const extension = finalFileName.split(".").pop() || "bin"
  const secureName = `${randomBytes(16).toString("hex")}.${extension}`

  if (finalMime.startsWith("image/") && !forceDocument && kind !== "animation") {
    try {
      processedBuffer = await sharp(buffer)
        .rotate()
        .toBuffer()
      console.log(`[upload] Image re-encoded and metadata stripped for ${file.name}`)
    } catch (err: any) {
      console.error(`[upload] Image re-encoding failed for ${file.name}:`, err)
      return jsonResponse({ error: "Arquivo de imagem corrompido ou inválido" }, 400)
    }
  }

  // Push the bytes to the private CDN chat; Telegram returns a reusable file_id.
  console.log(`[upload] Uploading to Telegram CDN chat ${cdnChatId}...`)
  let result: { ok: boolean; description?: string; media?: any }
  try {
    result = await client.uploadMedia(cdnChatId, kind, {
      data: processedBuffer,
      filename: secureName,
      mimeType: finalMime,
    })
  } catch (err: any) {
    console.error("[upload] uploadMedia threw:", err)
    return jsonResponse(
      { error: "Falha ao conectar com o Telegram. Verifique se o token do bot e o Chat ID estão corretos." },
      502,
    )
  }

  console.log(`[upload] Telegram response: ok=${result.ok}, hasMedia=${!!result.media}, description=${result.description ?? "(none)"}`)

  if (!result.ok || !result.media) {
    const desc = result.description ?? "Falha ao enviar para o Telegram"
    let friendlyError = desc
    if (desc.includes("chat not found") || desc.includes("Bad Request: chat not found")) {
      friendlyError = "Chat ID não encontrado. Verifique se o bot foi adicionado ao grupo/canal de armazenamento e o Chat ID está correto."
    } else if (desc.includes("Forbidden")) {
      friendlyError = "Bot sem permissão para enviar no grupo. Adicione o bot como admin ou participante do grupo."
    } else if (desc.includes("too large") || desc.includes("exceeds")) {
      friendlyError = "Arquivo muito grande para o Telegram."
    } else if (desc.includes("network") || desc.includes("TimeoutError") || desc.includes("ETIMEDOUT")) {
      friendlyError = "Timeout ao enviar para o Telegram — tente novamente."
    }
    return jsonResponse({ error: friendlyError }, 502)
  }

  const m = result.media

  // Dedupe: never store the same physical file twice for a store.
  if (m.fileUniqueId) {
    try {
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
        return jsonResponse({ media: existing[0], deduped: true })
      }
    } catch (err: any) {
      console.error("[upload] Dedupe check failed:", err)
      // Continue to insert — duplicate detection is best-effort.
    }
  }

  // Insert into DB
  console.log(`[upload] Inserting into DB: fileUniqueId=${m.fileUniqueId}, type=${m.type}`)
  let row: any
  try {
    const [inserted] = await db
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
    row = inserted
  } catch (err: any) {
    console.error("[upload] DB insert failed:", err)
    // If it's a unique constraint violation (duplicate fileUniqueId), try dedupe again
    if (err?.message?.includes("unique") || err?.message?.includes("duplicate")) {
      const [existing] = await db
        .select()
        .from(telegramMedia)
        .where(
          and(
            eq(telegramMedia.ownerId, user.storeId),
            eq(telegramMedia.fileUniqueId, m.fileUniqueId),
          ),
        )
        .limit(1)
      if (existing) {
        return jsonResponse({ media: existing, deduped: true })
      }
    }
    return jsonResponse({ error: "Erro ao salvar no banco de dados." }, 500)
  }

  // Log activity (best-effort, don't block the response)
  try {
    await logActivity({
      storeId: user.storeId,
      actor: { id: user.id, name: user.name },
      action: `Enviou mídia "${m.fileName ?? m.type}" para o CDN`,
      category: "posts",
    })
  } catch {
    // Ignore — logging is not critical.
  }

  console.log(`[upload] Success: media id=${row.id}, fileUniqueId=${m.fileUniqueId}`)
  return jsonResponse({ media: row })
}
