import "server-only"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { and, eq, inArray } from "drizzle-orm"

/**
 * Internal, server-only settings helpers.
 *
 * These are NOT server actions: they take a raw storeId and perform no auth
 * checks, so they must only be called from trusted server code that has
 * already authorized the caller (e.g. after requireCapability). Exposing them
 * as server actions would allow any authenticated user to pass an arbitrary
 * storeId and read another tenant's secrets (IDOR). `server-only` guarantees
 * this module can never be imported into client code.
 */

// Non-secret settings live in the DB, scoped per store.
export async function getSettings(storeId: string, keys: string[]) {
  if (keys.length === 0) return {}
  const rows = await db
    .select()
    .from(settings)
    .where(and(eq(settings.ownerId, storeId), inArray(settings.key, keys)))
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value ?? ""
  return map
}

export async function getSetting(
  storeId: string,
  key: string,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.ownerId, storeId), eq(settings.key, key)))
    .limit(1)
  return row?.value ?? null
}

export async function saveSetting(storeId: string, key: string, value: string) {
  // Atomic upsert backed by the unique index on (ownerId, key). Avoids the
  // read-then-write race that could create duplicate rows under concurrency.
  await db
    .insert(settings)
    .values({ ownerId: storeId, key, value })
    .onConflictDoUpdate({
      target: [settings.ownerId, settings.key],
      set: { value, updatedAt: new Date() },
    })
}
