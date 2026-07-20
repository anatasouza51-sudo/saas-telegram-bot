"use server"

import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { TelegramClient } from "@/lib/telegram"
import { db } from "@/lib/db"
import { telegramChats } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { 
  syncKnownChats, 
  isValidChatRow,
  grantedPermissions,
  missingPermissions,
} from "@/lib/tg/discovery"
import { saveSetting } from "@/lib/settings"

/**
 * Auto-detecta todos os grupos onde o bot é administrador
 * e sincroniza automaticamente com a base de dados.
 * 
 * Fluxo:
 * 1. Valida o token do bot
 * 2. Obtém informações do bot (getMe)
 * 3. Sincroniza todos os grupos conhecidos
 * 4. Retorna lista de grupos detectados
 */
export async function autoDetectTelegramGroups(): Promise<{
  ok: boolean
  error?: string
  groupsCount?: number
  groups?: Array<{
    id: number
    title: string
    chatId: string
    type: string
    memberCount: number | null
    isAdmin: boolean
    missingPermissions: string[]
  }>
}> {
  try {
    const user = await requireCapability("telegram.manage")
    
    // Importar o token salvo
    const { getSetting } = await import("@/lib/settings")
    const botToken = await getSetting(user.storeId, "telegram.botToken")
    
    if (!botToken) {
      return { 
        ok: false, 
        error: "Token do bot não configurado. Configure em Telegram Bot primeiro." 
      }
    }

    const client = new TelegramClient(botToken)
    const botId = client.botId

    if (!botId) {
      return { 
        ok: false, 
        error: "Token do bot inválido. Verifique o formato." 
      }
    }

    // Validar que o bot existe
    const meRes = await client.getMe()
    if (!meRes.ok || !meRes.result) {
      return { 
        ok: false, 
        error: "Não foi possível validar o token do bot. Verifique se está correto." 
      }
    }

    // Sincronizar todos os grupos conhecidos
    const syncResult = await syncKnownChats(user.storeId, botId, client)

    // Buscar todos os grupos sincronizados
    const groups = await db
      .select()
      .from(telegramChats)
      .where(and(
        eq(telegramChats.ownerId, user.storeId),
        eq(telegramChats.status, "active")
      ))

    // Preparar resposta com detalhes dos grupos
    const groupDetails = await Promise.all(
      groups.map(async (group) => {
        const memberRes = await client.getChatMember(group.chatId, botId)
        const member = memberRes.result
        
        return {
          id: group.id,
          title: group.title,
          chatId: group.chatId,
          type: group.type,
          memberCount: group.memberCount,
          isAdmin: member?.status === "administrator" || member?.status === "creator",
          missingPermissions: member 
            ? missingPermissions(member, group.type)
            : [],
        }
      })
    )

    // Log da atividade
    await logActivity({
      storeId: user.storeId,
      action: `Auto-detecção de grupos do Telegram realizada: ${groupDetails.length} grupo(s) encontrado(s)`,
      category: "settings",
      actor: user,
      details: `Bot: @${meRes.result.username || "desconhecido"}`,
    })

    return {
      ok: true,
      groupsCount: groupDetails.length,
      groups: groupDetails,
    }
  } catch (error) {
    console.error("Erro ao auto-detectar grupos:", error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao auto-detectar grupos",
    }
  }
}

/**
 * Sincroniza um grupo específico para a divulgação
 */
export async function syncGroupToAudience(groupId: number): Promise<{
  ok: boolean
  error?: string
}> {
  try {
    const user = await requireCapability("posts.manage")

    const group = await db
      .select()
      .from(telegramChats)
      .where(and(
        eq(telegramChats.ownerId, user.storeId),
        eq(telegramChats.id, groupId)
      ))
      .limit(1)

    if (!group.length) {
      return { ok: false, error: "Grupo não encontrado" }
    }

    // Atualizar o propósito para "audience" (divulgação)
    await db
      .update(telegramChats)
      .set({ purpose: "audience", updatedAt: new Date() })
      .where(eq(telegramChats.id, groupId))

    await logActivity({
      storeId: user.storeId,
      action: `Grupo "${group[0].title}" adicionado à área de divulgação`,
      category: "settings",
      actor: user,
    })

    return { ok: true }
  } catch (error) {
    console.error("Erro ao sincronizar grupo:", error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao sincronizar grupo",
    }
  }
}
