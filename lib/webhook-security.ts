import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Per-store webhook authenticity.
 *
 * Neither Telegram nor VeoPag give us a pre-shared signing key we control, so
 * we derive an unguessable, deterministic secret per store from a server-only
 * signing key. The token is:
 *   - Embedded in the VeoPag callback URL we register (only VeoPag + us know it).
 *   - Sent to Telegram as `secret_token` on setWebhook (Telegram echoes it back
 *     in the `X-Telegram-Bot-Api-Secret-Token` header on every update).
 *
 * The signing key never leaves the server. We reuse BETTER_AUTH_SECRET (always
 * present) unless a dedicated WEBHOOK_SIGNING_SECRET is provided.
 */
function signingKey(): string {
  const key =
    process.env.WEBHOOK_SIGNING_SECRET || process.env.BETTER_AUTH_SECRET
  if (!key) {
    // Fail closed: without a key we cannot produce/verify tokens.
    throw new Error("WEBHOOK_SIGNING_SECRET/BETTER_AUTH_SECRET não configurado")
  }
  return key
}

export type WebhookProvider = "telegram" | "veopag"

/** Deterministic, unguessable token for a given store + provider. */
export function webhookToken(provider: WebhookProvider, storeId: string): string {
  return createHmac("sha256", signingKey())
    .update(`${provider}:${storeId}`)
    .digest("hex")
}

/** Timing-safe verification of a presented token. */
export function verifyWebhookToken(
  provider: WebhookProvider,
  storeId: string,
  presented: string | null | undefined,
): boolean {
  if (!presented) return false
  let expected: string
  try {
    expected = webhookToken(provider, storeId)
  } catch {
    return false
  }
  const a = Buffer.from(expected)
  const b = Buffer.from(presented)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
