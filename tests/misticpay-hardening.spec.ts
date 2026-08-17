import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

test.describe("Integração Mistic Pay — hardening e contrato financeiro", () => {
  test("mantém a comissão fixa em centavos e bloqueia arredondamento silencioso", () => {
    const provider = source("lib/payment-provider.ts")
    const adapter = source("lib/misticpay.ts")
    expect(provider).toContain("PAYMENT_COMMISSION_CENTS = 75")
    expect(provider).toContain("BigInt(commissionCents) * BigInt(100)")
    expect(provider).toContain("PAYMENT_SPLIT_UNREPRESENTABLE")
    expect(provider).toContain("splitPercent")
    expect(adapter).toContain("calculateFixedCommissionSplit(input.amountCents)")
    expect(adapter).toContain("splitTax: Number(split.splitPercent)")
    expect(adapter).toContain("amount: input.amountCents / 100")
  })

  test("bloqueia configuração ausente antes de chamar a API", () => {
    const adapter = source("lib/misticpay.ts")
    expect(adapter).toContain("!credentials.clientId || !credentials.clientSecret || !credentials.splitUser")
    expect(adapter).toContain('code: "PAYMENT_NOT_CONFIGURED"')
  })

  test("timeout é ambíguo e não contém retry automático", () => {
    const adapter = source("lib/misticpay.ts")
    expect(adapter).toContain("REQUEST_TIMEOUT_MS")
    expect(adapter).toContain("PAYMENT_AMBIGUOUS")
    expect(adapter).toContain("consulte a transação antes de tentar novamente")
    expect(adapter).not.toContain("for (let attempt")
    expect(adapter).not.toContain("retry")
  })

  test("a consulta usa o endpoint oficial sem expor credenciais", () => {
    const adapter = source("lib/misticpay.ts")
    expect(adapter).toContain('"/transactions/check"')
    expect(adapter).toContain('method: "POST"')
    expect(adapter).toContain('body: JSON.stringify({ transactionId: paymentId })')
    expect(adapter).toContain('ci: credentials.clientId')
    expect(adapter).toContain('cs: credentials.clientSecret')
    expect(adapter).not.toContain("console.log(credentials")
  })

  test("webhook é autenticado por segredo, limitado e tenant-scoped", () => {
    const route = source("app/api/misticpay/webhook/[storeId]/[secret]/route.ts")
    expect(route).toContain('getWebhookSecret(storeId, "misticpay")')
    expect(route).toContain("safeEqual(secret, expected)")
    expect(route).toContain('namespace: "webhook"')
    expect(route).toContain("eq(orders.ownerId, storeId)")
    expect(route).toContain("eq(orders.id, transactionId)")
    expect(route).toContain("return NextResponse.json({ error: \"Not found\" }, { status: 404 })")
  })

  test("webhook rejeita valor divergente e não reprocessa pagamento entregue ou aprovado", () => {
    const route = source("app/api/misticpay/webhook/[storeId]/[secret]/route.ts")
    expect(route).toContain("Math.abs(webhookAmountCents - orderAmountCents) > 1")
    expect(route).toContain('order.deliveryStatus === "delivered"')
    expect(route).toContain('(order.paymentStatus === "approved" && status !== "approved")')
    expect(route).toContain('ne(orders.deliveryStatus, "delivered")')
    expect(route).toContain('ne(orders.paymentStatus, "approved")')
    expect(route).toContain("idempotent: true")
  })

  test("settings do splitUser são cifrados e a página só recebe estado mascarado", () => {
    const settings = source("lib/settings.ts")
    const action = source("app/actions/settings.ts")
    const page = source("app/(panel)/gateway/page.tsx")
    const form = source("components/settings/gateway-form.tsx")
    expect(settings).toContain('"misticpay.splitUser"')
    expect(settings).toContain("isSensitiveSettingKey(key) ? encrypt(value) : value")
    expect(action).toContain('getSetting(user.storeId, "misticpay.splitUser", { revealSensitive: true })')
    expect(page).toContain('hasSplitUser: provider.id === "misticpay" && saved["misticpay.splitUser"] === "[REDACTED]"')
    expect(page).toContain('splitUser: ""')
    expect(form).toContain("Deixe em branco para manter o destinatário salvo.")
  })
})
