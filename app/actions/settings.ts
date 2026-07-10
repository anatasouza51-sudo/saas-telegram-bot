"use server"

import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Non-secret settings live in the DB, scoped per store. Secrets (tokens/keys)
// live in env vars.
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
  const existing = await db
    .select()
    .from(settings)
    .where(and(eq(settings.ownerId, storeId), eq(settings.key, key)))
    .limit(1)
  if (existing.length > 0) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(and(eq(settings.ownerId, storeId), eq(settings.key, key)))
  } else {
    await db.insert(settings).values({ ownerId: storeId, key, value })
  }
}

export async function saveTelegramSettings(input: {
  botToken: string
  adminIds: string
}) {
  const user = await requireCapability("telegram.manage")
  await saveSetting(user.storeId, "telegram.botToken", input.botToken)
  await saveSetting(user.storeId, "telegram.adminIds", input.adminIds)
  await logActivity({
    storeId: user.storeId,
    action: "Configurações do Telegram atualizadas",
    category: "settings",
    actor: user,
  })
  revalidatePath("/telegram")
  return { ok: true }
}

export async function saveGatewaySettings(input: {
  publicKey: string
  secretKey: string
}) {
  const user = await requireCapability("gateway.manage")
  await saveSetting(user.storeId, "veopag.publicKey", input.publicKey)
  await saveSetting(user.storeId, "veopag.secretKey", input.secretKey)
  await logActivity({
    storeId: user.storeId,
    action: "Configurações do gateway VeoPag atualizadas",
    category: "settings",
    actor: user,
  })
  revalidatePath("/gateway")
  return { ok: true }
}
