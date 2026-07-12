import "server-only"
import type { TelegramClient } from "@/lib/telegram"

export type ChatValidation = {
  ok: boolean
  reason?: string
  title?: string
  username?: string
  type?: string
  botIsAdmin: boolean
  missingPermissions: string[]
}

// Permissions we require depending on chat kind. Channels need posting rights;
// groups need core admin management rights to reliably deliver posts.
const CHANNEL_PERMS: { key: keyof PermFlags; label: string }[] = [
  { key: "can_post_messages", label: "Publicar mensagens" },
]
const GROUP_PERMS: { key: keyof PermFlags; label: string }[] = [
  { key: "can_delete_messages", label: "Apagar mensagens" },
  { key: "can_manage_chat", label: "Gerenciar grupo" },
]

type PermFlags = {
  can_post_messages?: boolean
  can_edit_messages?: boolean
  can_delete_messages?: boolean
  can_manage_chat?: boolean
}

/**
 * Verifies the bot can operate in a chat: the chat exists, the bot is an
 * administrator, and it holds the permissions required for that chat type.
 * Returns a structured result the UI can surface (reason + missing perms).
 */
export async function validateChat(
  client: TelegramClient,
  chatId: string,
): Promise<ChatValidation> {
  const me = await client.getMe()
  if (!me.ok || !me.result) {
    return {
      ok: false,
      reason: "Token do bot inválido ou inacessível.",
      botIsAdmin: false,
      missingPermissions: [],
    }
  }

  const chat = await client.getChat(chatId)
  if (!chat.ok || !chat.result) {
    return {
      ok: false,
      reason:
        chat.description ??
        "Chat não encontrado. Verifique o Chat ID e se o bot foi adicionado.",
      botIsAdmin: false,
      missingPermissions: [],
    }
  }

  const info = chat.result
  const member = await client.getChatMember(chatId, me.result.id)
  if (!member.ok || !member.result) {
    return {
      ok: false,
      reason: "Não foi possível verificar o status do bot no chat.",
      title: info.title,
      username: info.username,
      type: info.type,
      botIsAdmin: false,
      missingPermissions: [],
    }
  }

  const status = member.result.status
  const isAdmin = status === "administrator" || status === "creator"
  if (!isAdmin) {
    return {
      ok: false,
      reason: "O bot não é administrador deste chat.",
      title: info.title,
      username: info.username,
      type: info.type,
      botIsAdmin: false,
      missingPermissions: ["Adicionar o bot como administrador"],
    }
  }

  const required = info.type === "channel" ? CHANNEL_PERMS : GROUP_PERMS
  const flags = member.result as PermFlags
  // creators implicitly have all permissions
  const missing =
    status === "creator"
      ? []
      : required.filter((p) => flags[p.key] !== true).map((p) => p.label)

  return {
    ok: missing.length === 0,
    reason: missing.length ? "Permissões de administrador faltando." : undefined,
    title: info.title,
    username: info.username,
    type: info.type,
    botIsAdmin: true,
    missingPermissions: missing,
  }
}
