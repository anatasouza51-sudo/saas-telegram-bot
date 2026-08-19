"use server"

import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { TelegramClient } from "@/lib/telegram"
import { getAppBaseUrl } from "@/lib/urls"
import { getOrCreateWebhookSecret } from "@/lib/webhook-secrets"
import { revalidatePath } from "next/cache"
import { getSetting, getSettings, saveSetting } from "@/lib/settings"
import { serializePixConfig, type PixConfig } from "@/lib/pix-config"
import { serializeCatalogConfig, type CatalogConfig } from "@/lib/catalog-config"
import { validateAdminIds, sanitizeTelegramHtml, validateImageUrl, validateBotToken, validateGatewayKey, validateWelcomeMessage, validatePixText, validatePixButtonText } from "@/lib/validation"

export async function saveTelegramSettings(input: {
  botToken?: string
  adminIds: string
}): Promise<{ ok: boolean; webhookRegistered?: boolean }> {
  const user = await requireCapability("telegram.manage")
  // Only overwrite the token when a new value is provided. The client never
  // receives the stored token, so an empty field means "keep current".
  const token = input.botToken ? validateBotToken(input.botToken) : undefined
  let webhookRegistered = false

  try {
    if (token) {
      await saveSetting(user.storeId, "telegram.botToken", token)
    }
    const adminIds = validateAdminIds(input.adminIds)
    await saveSetting(user.storeId, "telegram.adminIds", adminIds.join(","))
  } catch (err) {
    console.error("[settings] Falha ao salvar configurações do Telegram:", err)
    return { ok: false, webhookRegistered: false }
  }

  // Auto-register the webhook whenever admin IDs change or a new token is saved.
  // This guarantees the bot always stays connected — no need for a separate
  // "Connect" step. If the webhook registration fails we still return success
  // for the settings save (the admin can retry from the panel).
  const storedToken = await getSetting(user.storeId, "telegram.botToken", { revealSensitive: true })
  if (storedToken) {
    try {
      const url = `${getAppBaseUrl()}/api/telegram/webhook/${user.storeId}`
      const secretToken = await getOrCreateWebhookSecret(user.storeId, "telegram")
      const client = new TelegramClient(storedToken)
      const res = await client.setWebhook(url, secretToken)
      if (res.ok) {
        webhookRegistered = true
        await logActivity({
          storeId: user.storeId,
          action: "Webhook do Telegram registrado automaticamente ao salvar configurações",
          category: "settings",
          actor: user,
        })
      } else {
        // Non-fatal, but the reason must reach the admin's activity log —
        // otherwise the bot silently never receives updates.
        await logActivity({
          storeId: user.storeId,
          action: "Falha ao registrar o webhook do Telegram ao salvar configurações",
          category: "settings",
          actor: user,
          details: "O provedor recusou o registro do webhook; consulte o status no painel.",
        })
      }
    } catch (err) {
      // Non-fatal: the admin can still click "Connect bot" to retry.
      console.error("[settings] webhook auto-registration failed (token redacted)")
      await logActivity({
        storeId: user.storeId,
        action: "Falha ao registrar o webhook do Telegram ao salvar configurações",
        category: "settings",
        actor: user,
        details: "O registro automático do webhook falhou; nenhum segredo foi armazenado no log.",
      })
    }
  }

  try {
    await logActivity({
      storeId: user.storeId,
      action: "Configurações do Telegram atualizadas",
      category: "settings",
      actor: user,
    })
  } catch {
    // Logging is non-critical — never fail the save because of it
  }

  try {
    revalidatePath("/telegram")
  } catch {
    // revalidatePath can throw if the cache backend is unavailable; the settings
    // were still saved, so the next full page load will pick them up anyway.
  }

  return { ok: true, webhookRegistered }
}

export async function saveGatewaySettings(input: {
  provider: string
  publicKey: string
  secretKey?: string
  webhookToken?: string
  enabled?: boolean
}) {
  const user = await requireCapability("gateway.manage")
  const provider = input.provider.toLowerCase()
  const isDisabling = input.enabled === false
  const isOasyfy = provider === "oasyfy"

  const currentOasyfy = isOasyfy
    ? await getSettings(user.storeId, ["oasyfy.publicKey", "oasyfy.secretKey"], undefined, { revealSensitive: true })
    : {}
  const nextPublicKey = input.publicKey.trim() || currentOasyfy["oasyfy.publicKey"] || ""
  const nextSecretKey = input.secretKey?.trim() || currentOasyfy["oasyfy.secretKey"] || ""

  if (isOasyfy && !isDisabling && (!nextPublicKey || !nextSecretKey)) {
    throw new Error("Informe a chave pública e a chave secreta da conta vendedora para ativar a Oasy.fy.")
  }

  // Desativar não deve exigir que o administrador redigite uma credencial.
  // Ao salvar ou reativar, a chave pública continua sendo validada normalmente.
  if (!isDisabling || input.publicKey.trim()) {
    await saveSetting(user.storeId, `${provider}.publicKey`, validateGatewayKey(input.publicKey || nextPublicKey, "Chave pública"))
  }

  // Keep the stored secret when the field is left blank (never round-tripped
  // to the client).
  const secret = input.secretKey ? validateGatewayKey(input.secretKey, "Chave secreta") : undefined
  if (secret) {
    await saveSetting(user.storeId, `${provider}.secretKey`, secret)
  }

  if (isOasyfy && input.webhookToken?.trim()) {
    await saveSetting(user.storeId, "oasyfy.webhookToken", validateGatewayKey(input.webhookToken, "Token do webhook"))
  }

  if (typeof input.enabled === "boolean") {
    await saveSetting(user.storeId, `${provider}.enabled`, String(input.enabled))
  }

  await logActivity({
    storeId: user.storeId,
    action: isDisabling
      ? `Gateway ${input.provider} desativado`
      : input.enabled === true
        ? `Gateway ${input.provider} ativado`
        : `Configurações do gateway ${input.provider} atualizadas`,
    category: "settings",
    actor: user,
  })
  revalidatePath("/gateway")
  return { ok: true }
}

export async function savePixSettings(config: PixConfig) {
  const user = await requireCapability("gateway.manage")
  await saveSetting(user.storeId, "pix.config", serializePixConfig(config))
  await logActivity({
    storeId: user.storeId,
    action: "Configurações de pagamento PIX atualizadas",
    category: "settings",
    actor: user,
  })
  revalidatePath("/gateway")
  return { ok: true }
}

export async function saveCatalogSettings(config: CatalogConfig) {
  const user = await requireCapability("telegram.manage")
  await saveSetting(user.storeId, "catalog.config", serializeCatalogConfig(config))
  await logActivity({
    storeId: user.storeId,
    action: "Configurações de botões do catálogo atualizadas",
    category: "settings",
    actor: user,
  })
  revalidatePath("/telegram")
  return { ok: true }
}

export async function saveStoreCustomization(input: {
  welcomeMessage: string
  welcomeImageUrl: string
}) {
  const user = await requireCapability("telegram.manage")
  
  // Sanitization: prevent broken HTML in the bot and XSS in the panel.
  const welcomeMessage = sanitizeTelegramHtml(input.welcomeMessage).slice(0, 4000)
  const welcomeImageUrl = validateImageUrl(input.welcomeImageUrl)

  await saveSetting(user.storeId, "store.welcomeMessage", welcomeMessage)
  await saveSetting(user.storeId, "store.welcomeImageUrl", welcomeImageUrl ?? "")
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
  const token = await getSetting(user.storeId, "telegram.botToken", { revealSensitive: true })
  if (!token) {
    return { ok: false, error: "Configure o token do bot antes de conectar." }
  }
  const url = `${getAppBaseUrl()}/api/telegram/webhook/${user.storeId}`
  const secretToken = await getOrCreateWebhookSecret(user.storeId, "telegram")
  const client = new TelegramClient(token)
  const res = await client.setWebhook(url, secretToken)
  if (!res.ok) {
    return { ok: false, error: "Falha ao registrar o webhook. Verifique o token e tente novamente." }
  }
  await logActivity({
    storeId: user.storeId,
    action: "Webhook do Telegram registrado",
    category: "settings",
    actor: user,
  })
  return { ok: true }
}
