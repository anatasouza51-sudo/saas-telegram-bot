import "server-only"

import {
  amountToCents,
  centsToAmount,
  PAYMENT_COMMISSION_CENTS,
  type CheckPaymentResult,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentProvider,
} from "./payment-provider"

const OASYFY_BASE_URL = (process.env.OASYFY_BASE_URL ?? "https://app.oasyfy.com/api/v1").replace(/\/$/, "")
const REQUEST_TIMEOUT_MS = 10_000

type JsonRecord = Record<string, unknown>

export type OasyfyCredentials = {
  publicKey: string
  secretKey: string
  producerId: string
  webhookToken?: string
}

export type OasyfyWebhook = {
  event: string
  token: string
  orderId: string
  paymentId: string
  status: "approved" | "pending" | "refused"
  amountCents?: number
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {}
}

function nestedRecord(record: JsonRecord, key: string): JsonRecord {
  return asRecord(record[key])
}

function sanitizeProviderDetail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!normalized) return undefined
  const redacted = normalized.replace(
    /((?:x[-_]?public[-_]?key|x[-_]?secret[-_]?key|authorization|api[-_]?key|token|secret)\s*[:=]\s*)[^,; ]+/gi,
    "$1[redacted]",
  )
  return redacted.slice(0, 240)
}

function errorMessage(data: JsonRecord, fallback: string): string {
  const nested = nestedRecord(data, "data")
  const candidates = [
    data.details,
    data.errorDescription,
    nested.details,
    nested.errorDescription,
    data.message,
    data.error,
    nested.message,
  ]
  const message = candidates
    .map(sanitizeProviderDetail)
    .find((value): value is string => Boolean(value))
  return message ?? fallback
}

function providerAmountToCents(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return amountToCents(parsed) ?? undefined
}

function extractTransaction(data: JsonRecord): JsonRecord {
  const nested = data.transaction ?? data.data ?? data.order
  return nested && typeof nested === "object" ? asRecord(nested) : data
}

function extractPixCode(data: JsonRecord): string {
  const transaction = extractTransaction(data)
  const pix = nestedRecord(transaction, "pix")
  const candidates = [
    pix.copyPaste,
    pix.copy_paste,
    pix.qrCode,
    pix.qr_code,
    pix.code,
    transaction.copyPaste,
    transaction.copy_paste,
    transaction.qrCode,
    transaction.qr_code,
    transaction.pixCode,
    data.copyPaste,
    data.qrCode,
  ]
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? ""
}

function extractPaymentId(data: JsonRecord): string {
  const transaction = extractTransaction(data)
  const candidates = [
    data.transactionId,
    data.paymentId,
    data.id,
    transaction.transactionId,
    transaction.paymentId,
    transaction.id,
  ]
  return candidates.find((value) => typeof value === "string" || typeof value === "number")?.toString().trim() ?? ""
}

export function normalizeOasyfyStatus(raw: unknown): "approved" | "pending" | "refused" {
  const status = String(raw ?? "").trim().toUpperCase()
  if (["OK", "PAID", "COMPLETED", "APPROVED", "SUCCESS", "TRANSACTION_PAID"].includes(status)) return "approved"
  if (["FAILED", "REFUSED", "REJECTED", "CANCELED", "CANCELLED", "REFUNDED", "CHARGED_BACK", "TRANSACTION_CANCELED", "TRANSACTION_REFUNDED", "TRANSACTION_CHARGED_BACK"].includes(status)) return "refused"
  return "pending"
}

export function buildOasyfyCreatePayload(
  credentials: OasyfyCredentials,
  input: CreatePaymentInput,
): { ok: true; payload: JsonRecord; commissionCents: number } | { ok: false; code: string; error: string } {
  if (!credentials.publicKey || !credentials.secretKey || !credentials.producerId) {
    return { ok: false, code: "PAYMENT_NOT_CONFIGURED", error: "Oasy.fy não está configurada." }
  }
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= PAYMENT_COMMISSION_CENTS) {
    return { ok: false, code: "PAYMENT_SPLIT_UNREPRESENTABLE", error: "A comissão fixa não pode ser representada neste valor." }
  }
  if (!input.externalId.trim()) {
    return { ok: false, code: "PAYMENT_INVALID", error: "Identificador da transação inválido." }
  }

  const payerName = input.payer?.name ?? input.customerName ?? "Cliente"
  const payerEmail = input.payer?.email?.trim()
  const payerPhone = input.payer?.phone?.trim()
  const payerDocument = input.payer?.document?.trim()
  if (!payerName.trim() || !payerEmail || !payerPhone || !payerDocument) {
    return {
      ok: false,
      code: "PAYMENT_INVALID",
      error: "Para gerar o PIX Oasy.fy, informe nome, e-mail, telefone e CPF/CNPJ do pagador.",
    }
  }

  const client: JsonRecord = {
    name: payerName.trim(),
    email: payerEmail,
    phone: payerPhone,
    document: payerDocument,
  }

  const payload: JsonRecord = {
    identifier: input.externalId,
    amount: centsToAmount(input.amountCents),
    client,
    metadata: {
      provider: "ghostbot",
      orderId: input.externalId,
    },
    splits: [
      {
        producerId: credentials.producerId,
        amount: centsToAmount(PAYMENT_COMMISSION_CENTS),
      },
    ],
  }
  if (input.description.trim()) payload.metadata = { ...asRecord(payload.metadata), description: input.description.trim() }
  if (input.callbackUrl) payload.callbackUrl = input.callbackUrl

  return { ok: true, payload, commissionCents: PAYMENT_COMMISSION_CENTS }
}

async function oasyfyRequest(
  credentials: OasyfyCredentials,
  path: string,
  init: RequestInit,
): Promise<{ ok: true; status: number; data: JsonRecord } | { ok: false; code: "PAYMENT_AMBIGUOUS" | "PAYMENT_PROVIDER_ERROR"; error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${OASYFY_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-public-key": credentials.publicKey,
        "x-secret-key": credentials.secretKey,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    })
    const data = asRecord(await response.json().catch(() => ({})))
    if (!response.ok) {
      return { ok: false, code: "PAYMENT_PROVIDER_ERROR", error: errorMessage(data, `Oasy.fy respondeu HTTP ${response.status}.`) }
    }
    return { ok: true, status: response.status, data }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, code: "PAYMENT_AMBIGUOUS", error: "A criação da cobrança excedeu o tempo limite; consulte a transação antes de tentar novamente." }
    }
    return { ok: false, code: "PAYMENT_PROVIDER_ERROR", error: "Não foi possível comunicar com a Oasy.fy." }
  } finally {
    clearTimeout(timeout)
  }
}

export function parseOasyfyWebhookPayload(payload: unknown): OasyfyWebhook | null {
  const root = asRecord(payload)
  const transaction = nestedRecord(root, "transaction")
  const metadata = nestedRecord(transaction, "metadata")
  const rootMetadata = nestedRecord(root, "metadata")
  const event = String(root.event ?? "").trim().toUpperCase()
  const orderIdValue = transaction.clientIdentifier
    ?? transaction.client_identifier
    ?? transaction.identifier
    ?? metadata.orderId
    ?? rootMetadata.orderId
    ?? root.clientIdentifier
    ?? root.identifier
    ?? root.orderId
  const paymentIdValue = transaction.id
    ?? transaction.transactionId
    ?? transaction.transaction_id
    ?? root.transactionId
    ?? root.transaction_id
    ?? root.id
  const token = typeof root.token === "string" ? root.token.trim() : ""
  if (!event || (typeof orderIdValue !== "string" && typeof orderIdValue !== "number") || (typeof paymentIdValue !== "string" && typeof paymentIdValue !== "number")) return null

  const rawStatus = event || transaction.status || root.status
  const amountValue = transaction.chargeAmount
    ?? transaction.charge_amount
    ?? transaction.amount
    ?? root.amount
    ?? root.total

  return {
    event,
    token,
    orderId: String(orderIdValue).trim(),
    paymentId: String(paymentIdValue).trim(),
    status: normalizeOasyfyStatus(rawStatus),
    amountCents: providerAmountToCents(amountValue),
  }
}

export class OasyfyAdapter implements PaymentProvider {
  readonly id = "oasyfy"

  constructor(private readonly credentials: OasyfyCredentials) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const built = buildOasyfyCreatePayload(this.credentials, input)
    if (!built.ok) {
      return {
        ok: false,
        code: built.code as "PAYMENT_INVALID" | "PAYMENT_SPLIT_UNREPRESENTABLE" | "PAYMENT_NOT_CONFIGURED",
        error: built.error,
      }
    }

    const response = await oasyfyRequest(this.credentials, "/gateway/pix/receive", {
      method: "POST",
      body: JSON.stringify(built.payload),
    })
    if (!response.ok) return response

    const paymentId = extractPaymentId(response.data)
    const pixCode = extractPixCode(response.data)
    if (!paymentId || !pixCode) {
      return { ok: false, code: "PAYMENT_PROVIDER_ERROR", error: "Resposta da Oasy.fy sem identificadores PIX válidos." }
    }
    return { ok: true, paymentId, pixCode }
  }

  async checkPayment(paymentId: string, externalId?: string): Promise<CheckPaymentResult> {
    if (!paymentId) return { ok: false, code: "PAYMENT_NOT_FOUND", error: "Transação não informada." }
    const query = new URLSearchParams({ id: paymentId })
    if (externalId) query.set("clientIdentifier", externalId)
    const response = await oasyfyRequest(this.credentials, `/gateway/transactions?${query.toString()}`, { method: "GET" })
    if (!response.ok) return { ok: false, code: "PAYMENT_PROVIDER_ERROR", error: response.error }

    const transaction = extractTransaction(response.data)
    const returnedPaymentId = extractPaymentId(response.data)
    if (!returnedPaymentId) return { ok: false, code: "PAYMENT_NOT_FOUND", error: "Transação Oasy.fy não encontrada." }
    const amountCents = providerAmountToCents(transaction.chargeAmount ?? transaction.amount ?? response.data.amount)
    return {
      ok: true,
      paymentId: returnedPaymentId,
      status: normalizeOasyfyStatus(transaction.status ?? response.data.status),
      amountCents,
    }
  }
}
