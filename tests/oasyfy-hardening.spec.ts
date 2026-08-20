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

  test("exige dados completos do pagador e coleta PII cifrada no fluxo Telegram", () => {
    const adapter = source("lib/oasyfy.ts")
    const bot = source("lib/bot.ts")
    const schema = source("lib/db/schema.ts")
    const migration = source("lib/db/migrations/0006_customer_payer_data.sql")
    const records = source("lib/queries/records.ts")

    expect(adapter).toContain("!payerName.trim() || !payerEmail || !payerPhone || !payerDocument")
    expect(adapter).toContain("phone: payerPhone")
    expect(bot).toContain("validateBrazilianDocument")
    expect(bot).toContain("validateBrazilianPhone")
    expect(bot).toContain("encrypt(normalized)")
    expect(bot).toContain("paymentDataState")
    expect(bot).not.toContain('processing \\"${msg.text.trim()}\\"')
    expect(schema).toContain('email: text("email")')
    expect(schema).toContain('phone: text("phone")')
    expect(schema).toContain('document: text("document")')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "paymentDataState" text')
    expect(records).toContain(".select({")
    expect(records).not.toContain(".select()\n    .from(customers)")
  })

  test("preserva detalhes sanitizados de erros do provedor sem expor secrets", () => {
    const adapter = source("lib/oasyfy.ts")
    expect(adapter).toContain("data.details")
    expect(adapter).toContain("data.errorDescription")
    expect(adapter).toContain("nested.details")
    expect(adapter).toContain("nested.errorDescription")
    expect(adapter).toContain("[redacted]")
    expect(adapter).toContain("return redacted.slice(0, 240)")
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

  test("validação de ativação retorna erro seguro e não dispara render de Server Components", () => {
    const action = source("app/actions/platform-settings.ts")
    const form = source("components/admin-oasyfy-form.tsx")

    expect(action).toContain("Promise<{ ok: true } | { ok: false; error: string }>")
    expect(action).toContain('return { ok: false, error: "Informe o producerId da plataforma antes de ativar a Oasy.fy." }')
    expect(action).not.toContain('throw new Error("Informe o producerId da plataforma antes de ativar a Oasy.fy.")')
    expect(form).toContain("if (!result.ok)")
    expect(form).toContain("toast.error(result.error)")
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
