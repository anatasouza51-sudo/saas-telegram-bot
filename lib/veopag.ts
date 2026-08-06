/**
 * VeoPag gateway client — implements the official API contract:
 *   1. POST /api/auth/login  { client_id, client_secret } -> { token }  (JWT, 1h)
 *   2. POST /api/payments/deposit  (Bearer token) -> { qrCodeResponse }
 *
 * The JWT must be cached and reused (~55 min) to avoid the login rate limit
 * (25 attempts / 15 min per IP). We cache per client_id in module memory.
 *
 * Docs: https://veopag.readme.io
 */
const VEOPAG_BASE = process.env.VEOPAG_BASE_URL ?? "https://api.veopag.com"

export type VeoPagCredentials = {
  // In our settings these are stored as publicKey/secretKey, which map to
  // VeoPag's client_id / client_secret respectively.
  publicKey: string
  secretKey: string
}

export type CreateChargeInput = {
  amount: number
  externalId: string
  description: string
  customerName?: string
  callbackUrl?: string
  payer?: {
    name?: string
    email?: string
    document?: string
  }
}

export type CreateChargeResult =
  | {
      ok: true
      paymentId: string
      pixCode?: string
    }
  | { ok: false; error: string }

// --- Token cache (per client_id) --------------------------------------------
type CachedToken = { token: string; until: number }
const tokenCache = new Map<string, CachedToken>()

async function getToken(
  credentials: VeoPagCredentials,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const clientId = credentials.publicKey
  const now = Date.now()
  const cached = tokenCache.get(clientId)
  if (cached && now < cached.until) {
    return { ok: true, token: cached.token }
  }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let res
    try {
      res = await fetch(`${VEOPAG_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: credentials.publicKey,
          client_secret: credentials.secretKey,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, any>
    if (!res.ok || !data?.token) {
      return {
        ok: false,
        error: data?.message ?? `Falha na autenticação (HTTP ${res.status})`,
      }
    }
    // Reuse the token for ~55 minutes (token is valid for 1h).
    tokenCache.set(clientId, { token: data.token, until: now + 55 * 60 * 1000 })
    return { ok: true, token: data.token }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro de rede no login",
    }
  }
}

// A syntactically valid fallback CPF. VeoPag replaces mathematically invalid
// documents with a valid one internally, but we send a well-formed default so
// the request passes basic validation when the customer's real CPF is unknown.
const FALLBACK_DOCUMENT = "12345678909"

export async function createCharge(
  credentials: VeoPagCredentials,
  input: CreateChargeInput,
): Promise<CreateChargeResult> {
  if (!credentials.publicKey || !credentials.secretKey) {
    return { ok: false, error: "Credenciais da VeoPag não configuradas" }
  }

  const auth = await getToken(credentials)
  if (!auth.ok) return { ok: false, error: auth.error }

  const payerName = input.payer?.name ?? input.customerName ?? "Cliente"
  const payerEmail =
    input.payer?.email ?? `${input.externalId}@cliente.veopag.local`
  const payerDocument = input.payer?.document ?? FALLBACK_DOCUMENT

  const chargeStarted = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let res
    try {
      res = await fetch(`${VEOPAG_BASE}/api/payments/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          amount: input.amount,
          external_id: input.externalId,
          clientCallbackUrl: input.callbackUrl,
          payer: {
            name: payerName,
            email: payerEmail,
            document: payerDocument,
          },
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, any>
    const chargeElapsed = Date.now() - chargeStarted
    if (chargeElapsed > 3_000) {
      console.warn(`[veopag/createCharge] slow: ${chargeElapsed}ms`)
    }

    if (res.status === 401) {
      // Token was revoked; drop cache so the next attempt re-authenticates.
      tokenCache.delete(credentials.publicKey)
    }
    if (!res.ok) {
      return {
        ok: false,
        error: data?.message ?? `Falha ao criar cobrança (HTTP ${res.status})`,
      }
    }

    // Success can be 201 (created, nested under qrCodeResponse) or 200
    // (idempotent, fields at the top level).
    const qr = data.qrCodeResponse ?? data
    const paymentId = String(
      qr.transactionId ?? qr.transaction_id ?? data.transaction_id ?? input.externalId,
    )
    const pixCode = qr.qrcode ?? data.qrcode
    if (!pixCode) {
      return { ok: false, error: "Resposta da VeoPag sem código PIX" }
    }
    return { ok: true, paymentId, pixCode }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro de rede",
    }
  }
}

export type DepositStatusResult =
  | { ok: true; status: string; amount?: number; transactionId?: string }
  | { ok: false; error: string }

/**
 * Queries VeoPag directly by our external_id. This is the reconciliation
 * fallback for providers/webhooks that deliver the payment late or not at all.
 */
export async function getDepositStatus(
  credentials: VeoPagCredentials,
  externalId: string,
): Promise<DepositStatusResult> {
  if (!credentials.publicKey || !credentials.secretKey) {
    return { ok: false, error: "Credenciais da VeoPag não configuradas" }
  }
  const auth = await getToken(credentials)
  if (!auth.ok) return { ok: false, error: auth.error }

  try {
    const url = `${VEOPAG_BASE}/api/transactions/deposit?external_id=${encodeURIComponent(externalId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.token}` },
      signal: AbortSignal.timeout(10_000),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, any>
    if (res.status === 401) tokenCache.delete(credentials.publicKey)
    if (!res.ok) {
      return { ok: false, error: data?.message ?? `Falha ao consultar depósito (HTTP ${res.status})` }
    }
    const deposit = data.deposit
    if (!deposit) return { ok: true, status: "PENDING" }
    return {
      ok: true,
      status: String(deposit.status ?? "PENDING"),
      amount: deposit.amount == null ? undefined : Number(deposit.amount),
      transactionId: deposit.transaction_id ?? deposit.transactionId,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro de rede" }
  }
}

/** Normalizes VeoPag payment statuses into our internal statuses. */
export function mapPaymentStatus(
  raw: string,
): "approved" | "pending" | "refused" {
  const s = String(raw).toLowerCase()
  if (["paid", "approved", "completed", "confirmed"].includes(s))
    return "approved"
  if (["refused", "failed", "canceled", "cancelled", "expired"].includes(s))
    return "refused"
  return "pending"
}
