import crypto from "crypto"

/**
 * Thin wrapper around the VeoPag gateway. Credentials are per-store, loaded
 * from the settings table and passed in explicitly. Adjust the base URL /
 * field names to match VeoPag's live API contract when going to production.
 */
const VEOPAG_BASE = process.env.VEOPAG_BASE_URL ?? "https://api.veopag.com"

export type VeoPagCredentials = {
  publicKey: string
  secretKey: string
}

export type CreateChargeInput = {
  amount: number
  externalId: string
  description: string
  customerName?: string
}

export type CreateChargeResult =
  | {
      ok: true
      paymentId: string
      pixCode?: string
      checkoutUrl?: string
    }
  | { ok: false; error: string }

export async function createCharge(
  credentials: VeoPagCredentials,
  input: CreateChargeInput,
): Promise<CreateChargeResult> {
  if (!credentials.publicKey || !credentials.secretKey) {
    return { ok: false, error: "Credenciais da VeoPag não configuradas" }
  }
  try {
    const res = await fetch(`${VEOPAG_BASE}/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-public-key": credentials.publicKey,
        "x-secret-key": credentials.secretKey,
      },
      body: JSON.stringify({
        amount: input.amount,
        external_id: input.externalId,
        description: input.description,
        customer: { name: input.customerName },
        payment_method: "pix",
      }),
    })
    const data = (await res.json()) as Record<string, any>
    if (!res.ok) {
      return { ok: false, error: data?.message ?? "Falha ao criar cobrança" }
    }
    return {
      ok: true,
      paymentId: String(data.id ?? data.transaction_id ?? input.externalId),
      pixCode: data.pix?.qrcode ?? data.qr_code,
      checkoutUrl: data.checkout_url ?? data.payment_url,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro de rede",
    }
  }
}

/**
 * Validates the webhook signature using HMAC-SHA256 over the raw body with the
 * store's secret key. VeoPag sends the signature in the `x-veopag-signature`
 * header.
 */
export function verifyWebhookSignature(
  secretKey: string | null | undefined,
  rawBody: string,
  signature: string | null,
): boolean {
  if (!secretKey) return false
  if (!signature) return false
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(rawBody)
    .digest("hex")
  // Constant-time comparison.
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

/** Normalizes VeoPag payment statuses into our internal statuses. */
export function mapPaymentStatus(
  raw: string,
): "approved" | "pending" | "refused" {
  const s = raw.toLowerCase()
  if (["paid", "approved", "completed", "confirmed"].includes(s))
    return "approved"
  if (["refused", "failed", "canceled", "cancelled", "expired"].includes(s))
    return "refused"
  return "pending"
}
