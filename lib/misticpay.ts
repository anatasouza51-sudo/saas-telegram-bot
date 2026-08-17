import "server-only"

import {
  calculateFixedCommissionSplit,
  normalizeProviderStatus,
  type CheckPaymentResult,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentProvider,
} from "./payment-provider"

const MISTICPAY_BASE_URL = (process.env.MISTICPAY_BASE_URL ?? "https://api.misticpay.com/api").replace(/\/$/, "")
const REQUEST_TIMEOUT_MS = 10_000

export type MisticPayCredentials = {
  clientId: string
  clientSecret: string
  splitUser: string
}

type JsonRecord = Record<string, unknown>

function errorMessage(data: JsonRecord, fallback: string): string {
  return typeof data.message === "string" && data.message.length < 200 ? data.message : fallback
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {}
}

function extractTransaction(data: JsonRecord): JsonRecord {
  return asRecord(data.data ?? data.transaction ?? data)
}

export function buildMisticPayCreatePayload(
  credentials: MisticPayCredentials,
  input: CreatePaymentInput,
): { ok: true; payload: JsonRecord; splitPercent: string } | { ok: false; code: string; error: string } {
  const split = calculateFixedCommissionSplit(input.amountCents)
  if (!split.ok) return split
  if (!credentials.clientId || !credentials.clientSecret || !credentials.splitUser) {
    return { ok: false, code: "PAYMENT_NOT_CONFIGURED", error: "Mistic Pay não está configurada." }
  }

  const payload: JsonRecord = {
    amount: input.amountCents / 100,
    payerName: input.payer?.name ?? input.customerName ?? "Cliente",
    transactionId: input.externalId,
    description: input.description,
    splitUser: credentials.splitUser,
    splitTax: Number(split.splitPercent),
  }
  if (input.payer?.document) payload.payerDocument = input.payer.document
  if (input.callbackUrl) payload.projectWebhook = input.callbackUrl

  return { ok: true, payload, splitPercent: split.splitPercent }
}

async function misticRequest(
  credentials: MisticPayCredentials,
  path: string,
  init: RequestInit,
): Promise<{ ok: true; status: number; data: JsonRecord } | { ok: false; code: "PAYMENT_AMBIGUOUS" | "PAYMENT_PROVIDER_ERROR"; error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${MISTICPAY_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ci: credentials.clientId,
        cs: credentials.clientSecret,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    })
    const data = asRecord(await response.json().catch(() => ({})))
    if (!response.ok) {
      return { ok: false, code: "PAYMENT_PROVIDER_ERROR", error: errorMessage(data, `Mistic Pay respondeu HTTP ${response.status}.`) }
    }
    return { ok: true, status: response.status, data }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, code: "PAYMENT_AMBIGUOUS", error: "A criação da cobrança excedeu o tempo limite; consulte a transação antes de tentar novamente." }
    }
    return { ok: false, code: "PAYMENT_PROVIDER_ERROR", error: "Não foi possível comunicar com a Mistic Pay." }
  } finally {
    clearTimeout(timeout)
  }
}

export class MisticPayAdapter implements PaymentProvider {
  readonly id = "misticpay"

  constructor(private readonly credentials: MisticPayCredentials) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const built = buildMisticPayCreatePayload(this.credentials, input)
    if (!built.ok) {
      return { ok: false, code: built.code as "PAYMENT_INVALID" | "PAYMENT_SPLIT_UNREPRESENTABLE" | "PAYMENT_NOT_CONFIGURED", error: built.error }
    }

    const response = await misticRequest(this.credentials, "/transactions/create", {
      method: "POST",
      body: JSON.stringify(built.payload),
    })
    if (!response.ok) return response

    const transaction = extractTransaction(response.data)
    const paymentId = transaction.transactionId == null ? "" : String(transaction.transactionId)
    const pixCode = typeof transaction.copyPaste === "string" ? transaction.copyPaste : ""
    if (!paymentId || !pixCode) {
      return { ok: false, code: "PAYMENT_PROVIDER_ERROR", error: "Resposta da Mistic Pay sem identificadores PIX válidos." }
    }
    return { ok: true, paymentId, pixCode }
  }

  async checkPayment(paymentId: string): Promise<CheckPaymentResult> {
    if (!paymentId) return { ok: false, code: "PAYMENT_NOT_FOUND", error: "Transação não informada." }
    const response = await misticRequest(this.credentials, "/transactions/check", {
      method: "POST",
      body: JSON.stringify({ transactionId: paymentId }),
    })
    if (!response.ok) {
      return { ok: false, code: "PAYMENT_PROVIDER_ERROR", error: response.error }
    }

    const transaction = extractTransaction(response.data)
    if (!transaction.transactionId) return { ok: false, code: "PAYMENT_NOT_FOUND", error: "Transação Mistic Pay não encontrada." }
    const rawValue = transaction.value
    const amountCents = typeof rawValue === "number" ? Math.round(rawValue) : undefined
    return {
      ok: true,
      paymentId: String(transaction.transactionId),
      status: normalizeProviderStatus(transaction.transactionState),
      amountCents,
    }
  }
}
