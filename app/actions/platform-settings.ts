"use server"

import { revalidatePath } from "next/cache"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import {
  getPlatformMisticPayConfig,
  PLATFORM_SETTING_KEYS,
  savePlatformSetting,
} from "@/lib/platform-settings"
import { validateGatewayKey, validateInteger } from "@/lib/validation"
import { logActivity } from "@/lib/log"

function validateCommissionPercent(value: unknown): string {
  const percent = Number(value)
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("A comissão deve estar entre 0% e 100%.")
  }
  return String(percent)
}

export async function savePlatformMisticPaySettings(input: {
  clientId: string
  clientSecret?: string
  splitUser?: string
  commissionCents: number
  commissionPercent: number
  enabled: boolean
}): Promise<{ ok: true }> {
  const admin = await requirePlatformAdmin()
  const clientId = validateGatewayKey(input.clientId, "Client ID da plataforma")
  const commissionCents = validateInteger(input.commissionCents, "Comissão em centavos")
  const commissionPercent = validateCommissionPercent(input.commissionPercent)
  const current = await getPlatformMisticPayConfig({ revealSensitive: true })
  const clientSecret = input.clientSecret?.trim()
  const splitUser = input.splitUser?.trim()

  if (input.enabled && !clientSecret && !current.clientSecret) {
    throw new Error("Informe o Client Secret da plataforma antes de ativar o gateway.")
  }
  if (input.enabled && !splitUser && !current.splitUser) {
    throw new Error("Informe o splitUser da plataforma antes de ativar o gateway.")
  }

  await savePlatformSetting(PLATFORM_SETTING_KEYS.misticPayClientId, clientId)
  if (clientSecret) {
    await savePlatformSetting(PLATFORM_SETTING_KEYS.misticPayClientSecret, validateGatewayKey(clientSecret, "Client Secret da plataforma"))
  }
  if (splitUser) {
    await savePlatformSetting(PLATFORM_SETTING_KEYS.misticPaySplitUser, validateGatewayKey(splitUser, "splitUser da plataforma"))
  }
  await savePlatformSetting(PLATFORM_SETTING_KEYS.misticPayCommissionCents, String(commissionCents))
  await savePlatformSetting(PLATFORM_SETTING_KEYS.misticPayCommissionPercent, commissionPercent)
  await savePlatformSetting(PLATFORM_SETTING_KEYS.misticPayEnabled, String(input.enabled))

  await logActivity({
    storeId: admin.storeId,
    action: input.enabled
      ? "Configuração global Mistic Pay atualizada"
      : "Mistic Pay global desativada",
    category: "settings",
    actor: admin,
    details: "Nenhum segredo ou valor de comissão foi registrado no log.",
  })

  revalidatePath("/admin/gateways")
  revalidatePath("/admin/commission")
  revalidatePath("/gateway")
  return { ok: true }
}

export async function getPlatformMisticPayAdminState() {
  await requirePlatformAdmin()
  const config = await getPlatformMisticPayConfig()
  return {
    configured: Boolean(config.clientId),
    enabled: config.enabled,
    clientId: config.clientId,
    hasClientSecret: Boolean(config.clientSecret),
    hasSplitUser: Boolean(config.splitUser),
    commissionCents: config.commissionCents,
    commissionPercent: config.commissionPercent,
  }
}

export async function savePlatformCommissionSettings(input: {
  commissionCents: number
  commissionPercent: number
}): Promise<{ ok: true }> {
  const admin = await requirePlatformAdmin()
  const commissionCents = validateInteger(input.commissionCents, "Comissão em centavos")
  const commissionPercent = validateCommissionPercent(input.commissionPercent)

  await savePlatformSetting(PLATFORM_SETTING_KEYS.misticPayCommissionCents, String(commissionCents))
  await savePlatformSetting(PLATFORM_SETTING_KEYS.misticPayCommissionPercent, commissionPercent)

  await logActivity({
    storeId: admin.storeId,
    action: "Política de comissão da plataforma atualizada",
    category: "settings",
    actor: admin,
    details: "Nenhum valor sensível ou destinatário foi registrado no log.",
  })

  revalidatePath("/admin/commission")
  revalidatePath("/admin/gateways")
  return { ok: true }
}
