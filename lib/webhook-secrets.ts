import "server-only"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { generateSecret } from "@/lib/security"

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
  return row?.value ?? null
}

/** Returns the existing secret or creates, stores and returns a new one. */
export async function getOrCreateWebhookSecret(
  storeId: string,
  provider: WebhookProvider,
): Promise<string> {
  const existing = await getWebhookSecret(storeId, provider)
  if (existing) return existing
  const secret = generateSecret()
  await db
    .insert(settings)
    .values({ ownerId: storeId, key: key(provider), value: secret })
    .onConflictDoNothing({ target: [settings.ownerId, settings.key] })
  // Re-read in case of a concurrent insert winning the race.
  return (await getWebhookSecret(storeId, provider)) ?? secret
}
