import "server-only"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { generateSecret } from "@/lib/security"
import { encrypt, decrypt, isEncrypted } from "./crypto"

/**
 * Per-store webhook secrets. Each provider gets an unguessable secret stored
 * in the (server-only) settings table, scoped by store. These secrets never
 * leave the server except embedded in the provider-facing callback URL /
 * Telegram secret_token, and are used to authenticate inbound webhooks.
 */
export type WebhookProvider = "veopag" | "telegram"

function key(provider: WebhookProvider) {
  return `${provider}.webhookSecret`
}

/** Reads the stored secret for a store/provider, or null if not set yet. */
export async function getWebhookSecret(
  storeId: string,
  provider: WebhookProvider,
): Promise<string | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.ownerId, storeId), eq(settings.key, key(provider))))
    .limit(1)
  
  const val = row?.value ?? null
  if (!val) return null
  if (!isEncrypted(val)) {
    throw new Error("Webhook secret is not encrypted")
  }
  return decrypt(val)
}

function isRelationNotFound(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes("does not exist") || msg.includes("42P01") || msg.includes("relation ")
}

/** Returns the existing secret or creates, stores and returns a new one. */
export async function getOrCreateWebhookSecret(
  storeId: string,
  provider: WebhookProvider,
): Promise<string> {
  const existing = await getWebhookSecret(storeId, provider)
  if (existing) return existing
  const secret = generateSecret()
  const encrypted = encrypt(secret)
  try {
    await db
      .insert(settings)
      .values({ ownerId: storeId, key: key(provider), value: encrypted })
      .onConflictDoNothing({ target: [settings.ownerId, settings.key] })
  } catch (err) {
    if (isRelationNotFound(err)) {
      throw new Error("Webhook secret storage is unavailable; apply database migrations before serving traffic")
    }
    throw err
  }
  // Re-read in case of a concurrent insert winning the race.
  return (await getWebhookSecret(storeId, provider)) ?? secret
}
