"use server"

import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Non-secret settings live in the DB. Secrets (tokens/keys) live in env vars.
export async function getSettings(keys: string[]) {
  if (keys.length === 0) return {}
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, keys))
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value ?? ""
  return map
}

export async function saveSetting(key: string, value: string) {
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)
  if (existing.length > 0) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
  } else {
    await db.insert(settings).values({ key, value })
  }
}

export async function saveTelegramSettings(input: {
  webhookUrl: string
  adminIds: string
}) {
  const user = await requireCapability("telegram.manage")
  await saveSetting("telegram.webhookUrl", input.webhookUrl)
  await saveSetting("telegram.adminIds", input.adminIds)
  await logActivity({
    action: "Configurações do Telegram atualizadas",
    category: "settings",
    actor: user,
  })
  revalidatePath("/telegram")
  return { ok: true }
}

export async function saveGatewaySettings(input: {
  webhookUrl: string
  callbackUrl: string
}) {
  const user = await requireCapability("gateway.manage")
  await saveSetting("veopag.webhookUrl", input.webhookUrl)
  await saveSetting("veopag.callbackUrl", input.callbackUrl)
  await logActivity({
    action: "Configurações do gateway VeoPag atualizadas",
    category: "settings",
    actor: user,
  })
  revalidatePath("/gateway")
  return { ok: true }
}
