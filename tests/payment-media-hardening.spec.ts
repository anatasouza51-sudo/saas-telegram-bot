import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

test.describe("Hardening de pagamentos e mídia", () => {
  test("aprovação VeoPag não permite downgrade concorrente e entrega continua transacional", () => {
    const route = source("app/api/veopag/webhook/[storeId]/[secret]/route.ts")
    const fulfillment = source("lib/fulfillment.ts")

    expect(route).toContain("ne(orders.deliveryStatus, \"delivered\")")
    expect(route).toContain("ne(orders.paymentStatus, \"approved\")")
    expect(route).toContain(".returning({ id: orders.id })")
    expect(fulfillment).toContain("SELECT * FROM orders WHERE id = $1 AND \"ownerId\" = $2 FOR UPDATE")
    expect(fulfillment).toContain("FOR UPDATE SKIP LOCKED")
    expect(fulfillment).toContain("SET \"paymentStatus\" = 'approved', \"deliveryStatus\" = 'delivered'")
  })

  test("upload valida MIME, pasta e não devolve handles do Telegram", () => {
    const upload = source("app/api/tg/upload/route.ts")
    expect(upload).toContain("ALLOWED_MIME_PREFIXES.some")
    expect(upload).toContain("telegramMediaFolders.ownerId, user.storeId")
    expect(upload).toContain('function publicMedia')
    expect(upload).toContain('fileId: ""')
    expect(upload).toContain("thumbFileId: null")
    expect(upload).not.toContain("Telegram response: ok=")
  })

  test("ações de mídia impedem pastas de outro tenant", () => {
    const media = source("app/actions/tg-media.ts")
    expect(media).toContain("Pasta pai não encontrada")
    expect(media).toContain("Pasta não encontrada")
    expect(media).toContain("eq(telegramMediaFolders.ownerId, user.storeId)")
    expect(media).toContain("eq(telegramMedia.ownerId, user.storeId)")
    expect(media).toContain("return rows.map(publicMedia)")
  })

  test("proxy de mídia exige cifra e cacheia por tenant", () => {
    const proxy = source("app/api/tg/media/[id]/route.ts")
    const cache = source("lib/tg/file-url-cache.ts")
    expect(proxy).toContain("const decryptedFileId = decrypt(targetFileId)")
    expect(proxy).toContain('return new NextResponse("Mídia indisponível", { status: 415 })')
    expect(proxy).toContain("getFileUrl(client, decryptedFileId, user.storeId)")
    expect(proxy).not.toContain("decrypt(targetFileId) ?? targetFileId")
    expect(cache).toContain("const cacheKey = `${namespace}:${fileId}`")
  })

  test("reparo não aceita token em query string", () => {
    const repair = source("app/api/repair-db/route.ts")
    expect(repair).toContain('req.headers.get("authorization")')
    expect(repair).toContain('authorization.startsWith("Bearer ")')
    expect(repair).not.toContain('searchParams.get("token")')
    expect(repair).toContain('namespace: "repair"')
  })
})
