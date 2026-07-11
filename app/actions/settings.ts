"use server"

import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { TelegramClient } from "@/lib/telegram"
import { getAppBaseUrl } from "@/lib/urls"
import { getOrCreateWebhookSecret } from "@/lib/webhook-secrets"
import { revalidatePath } from "next/cache"
import { getSetting, saveSetting } from "@/lib/settings"

export async function saveTelegramSettings(input: {
  botToken?: string
  adminIds: string
}) {
  const user = await requireCapability("telegram.manage")
  // Only overwrite the token when a new value is provided. The client never
  // receives the stored token, so an empty field means "keep current".
  const token = input.botToken?.trim()
  if (token) {
    await saveSetting(user.storeId, "telegram.botToken", token)
  }
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
  secretKey?: string
}) {
  const user = await requireCapability("gateway.manage")
  await saveSetting(user.storeId, "veopag.publicKey", input.publicKey.trim())
  // Keep the stored secret when the field is left blank (never round-tripped
  // to the client).
  const secret = input.secretKey?.trim()
  if (secret) {
    await saveSetting(user.storeId, "veopag.secretKey", secret)
  }
  await logActivity({
    storeId: user.storeId,
    action: "Configurações do gateway VeoPag atualizadas",
    category: "settings",
    actor: user,
  })
  revalidatePath("/gateway")
  return { ok: true }
}

export async function saveStoreCustomization(input: {
  welcomeMessage: string
  welcomeImageUrl: string
}) {
  const user = await requireCapability("telegram.manage")
  await saveSetting(user.storeId, "store.welcomeMessage", input.welcomeMessage)
  await saveSetting(user.storeId, "store.welcomeImageUrl", input.welcomeImageUrl)
  await logActivity({
    storeId: user.storeId,
    action: "Personalização da loja atualizada",
    category: "settings",
    actor: user,
  })
  revalidatePath("/telegram")
  return { ok: true }
}

// Registers this store's webhook URL with the Telegram Bot API using the
// store's saved token, so the bot starts receiving updates.
export async function registerTelegramWebhook(): Promise<{
  ok: boolean
  error?: string
}> {
  const user = await requireCapability("telegram.manage")
  const token = await getSetting(user.storeId, "telegram.botToken")
  if (!token) {
    return { ok: false, error: "Configure o token do bot antes de conectar." }
  }
  const url = `${getAppBaseUrl()}/api/telegram/webhook/${user.storeId}`
  const secretToken = await getOrCreateWebhookSecret(user.storeId, "telegram")
  const client = new TelegramClient(token)
  const res = await client.setWebhook(url, secretToken)
  if (!res.ok) {
    return { ok: false, error: res.description ?? "Falha ao registrar webhook" }
  }
  await logActivity({
    storeId: user.storeId,
    action: "Webhook do Telegram registrado",
    category: "settings",
    actor: user,
  })
  return { ok: true }
}
