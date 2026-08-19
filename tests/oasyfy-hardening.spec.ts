import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

test.describe("Integração Oasy.fy — contrato e hardening", () => {
  test("usa autenticação oficial, endpoint PIX e split fixo em R$0,75", () => {
    const adapter = source("lib/oasyfy.ts")
    expect(adapter).toContain('"x-public-key": credentials.publicKey')
    expect(adapter).toContain('"x-secret-key": credentials.secretKey')
    expect(adapter).toContain('"/gateway/pix/receive"')
    expect(adapter).toContain('producerId: credentials.producerId')
    expect(adapter).toContain("amount: centsToAmount(PAYMENT_COMMISSION_CENTS)")
    expect(adapter).not.toContain("splitTax")
    expect(adapter).not.toContain("splitPercent")
  })

  test("bloqueia configuração incompleta e valores que não comportam a comissão", () => {
    const adapter = source("lib/oasyfy.ts")
    expect(adapter).toContain("!credentials.publicKey || !credentials.secretKey || !credentials.producerId")
    expect(adapter).toContain('code: "PAYMENT_NOT_CONFIGURED"')
    expect(adapter).toContain("input.amountCents <= PAYMENT_COMMISSION_CENTS")
    expect(adapter).toContain('code: "PAYMENT_SPLIT_UNREPRESENTABLE"')
  })

  test("trata timeout como ambíguo e não faz retry automático", () => {
    const adapter = source("lib/oasyfy.ts")
    expect(adapter).toContain("REQUEST_TIMEOUT_MS")
    expect(adapter).toContain('code: "PAYMENT_AMBIGUOUS"')
    expect(adapter).toContain("consulte a transação antes de tentar novamente")
    expect(adapter).not.toContain("for (let attempt")
    expect(adapter).not.toContain("retry")
  })

  test("consulta transações sem expor secrets e preserva o identificador externo", () => {
    const adapter = source("lib/oasyfy.ts")
    expect(adapter).toContain('`/gateway/transactions?${query.toString()}`')
    expect(adapter).toContain('query.set("clientIdentifier", externalId)')
    expect(adapter).toContain('"x-public-key": credentials.publicKey')
    expect(adapter).toContain('"x-secret-key": credentials.secretKey')
    expect(adapter).not.toContain("console.log(credentials")
  })

  test("webhook usa segredo por tenant, token opcional, rate limit e escopo do pedido", () => {
    const route = source("app/api/oasyfy/webhook/[storeId]/[secret]/route.ts")
    expect(route).toContain('getWebhookSecret(storeId, "oasyfy")')
    expect(route).toContain("safeEqual(secret, expectedUrlSecret)")
    expect(route).toContain('getSetting(storeId, "oasyfy.webhookToken"')
    expect(route).toContain("safeEqual(parsed.token, configuredProviderToken)")
    expect(route).toContain('namespace: "webhook"')
    expect(route).toContain("eq(orders.ownerId, storeId)")
    expect(route).toContain("eq(orders.id, parsed.orderId)")
    expect(route).toContain('return NextResponse.json({ error: "Not found" }, { status: 404 })')
  })

  test("webhook rejeita transação divergente, valor divergente e downgrade", () => {
    const route = source("app/api/oasyfy/webhook/[storeId]/[secret]/route.ts")
    expect(route).toContain("order.paymentId !== parsed.paymentId")
    expect(route).toContain("Math.abs(parsed.amountCents - orderAmountCents) > 1")
    expect(route).toContain('order.deliveryStatus === "delivered"')
    expect(route).toContain('(order.paymentStatus === "approved" && parsed.status !== "approved")')
    expect(route).toContain('ne(orders.deliveryStatus, "delivered")')
    expect(route).toContain('ne(orders.paymentStatus, "approved")')
    expect(route).toContain("idempotent: true")
  })

  test("tenant recebe somente credenciais próprias e não recebe producerId ou regra de comissão", () => {
    const settings = source("lib/settings.ts")
    const action = source("app/actions/settings.ts")
    const page = source("app/(panel)/gateway/page.tsx")
    const form = source("components/settings/gateway-form.tsx")
    const platformSettings = source("lib/platform-settings.ts")
    const platformActions = source("app/actions/platform-settings.ts")
    const adminPage = source("app/(admin)/admin/(protected)/gateways/page.tsx")
    const adminForm = source("components/admin-oasyfy-form.tsx")
    const bot = source("lib/bot.ts")

    expect(settings).toContain('"oasyfy.secretKey"')
    expect(settings).toContain('"oasyfy.webhookToken"')
    expect(settings).toContain('"oasyfy.producerId"')
    expect(settings).toContain('throw new Error(`A configuração ${key} pertence ao control plane da plataforma.`)')
    expect(action).not.toContain('getSettings(user.storeId, ["oasyfy.publicKey", "oasyfy.secretKey", "oasyfy.producerId"')
    expect(action).not.toContain('saveSetting(user.storeId, "oasyfy.producerId"')
    expect(action).not.toContain("producerId?: string")
    expect(page).not.toContain("producerId")
    expect(page).not.toContain("commission")
    expect(form).not.toContain("producerId da plataforma")
    expect(form).not.toContain("R$ 0,75")
    expect(form).toContain("Token do webhook da Oasy.fy")
    expect(platformSettings).toContain('oasyfyProducerId: "oasyfy.platform.producerId"')
    expect(platformSettings).toContain("commissionCents: 75")
    expect(platformActions).toContain("requirePlatformAdmin()")
    expect(platformActions).toContain("savePlatformOasyfySettings")
    expect(adminPage).toContain("AdminOasyfyForm")
    expect(adminForm).toContain("R$ {(initial.commissionCents / 100)")
    expect(bot).toContain("getPlatformOasyfyConfig({ revealSensitive: true })")
    expect(bot).toContain("producerId: platformOasyfy.producerId")
    expect(bot).toContain("new OasyfyAdapter(ctx.oasyfy)")
    expect(bot).toContain("/api/oasyfy/webhook/")
  })
})
