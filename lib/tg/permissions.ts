// Shared, framework-agnostic permission metadata. Kept free of "server-only"
// so both the discovery engine (server) and the panel (client) can import it.

// Admin permissions we consider required for the bot to fully operate a
// destination (post, edit, delete). When any are missing the panel shows a
// "sem permissões suficientes" status.
//
// IMPORTANT: `can_post_messages` and `can_edit_messages` ONLY exist for
// channels. In groups/supergroups any member can send messages, so those
// fields are never present on the bot's admin record — requiring them there
// incorrectly reports "faltando" even when the bot has every group permission.
// Requirements must therefore be scoped by chat type.
export const REQUIRED_PERMISSIONS = [
  "can_post_messages",
  "can_edit_messages",
  "can_delete_messages",
] as const

// Type-aware required permissions. Channels need posting/editing/deleting;
// groups only need delete (posting is implicit for members).
export function requiredPermissionsForType(
  type: string | undefined | null,
): string[] {
  if (type === "channel") {
    return ["can_post_messages", "can_edit_messages", "can_delete_messages"]
  }
  // group / supergroup (and any other real chat)
  return ["can_delete_messages"]
}

// Permission keys that are meaningful for a given chat type, used to compute
// the "granted" list so channel-only keys never count against a group.
export function relevantPermissionsForType(
  type: string | undefined | null,
): string[] {
  if (type === "channel") return ALL_PERMISSION_KEYS
  // Groups don't expose channel-only posting/editing permissions.
  return ALL_PERMISSION_KEYS.filter(
    (k) => k !== "can_post_messages" && k !== "can_edit_messages",
  )
}

// Human-readable labels for every permission we track, used by the panel.
export const PERMISSION_LABELS: Record<string, string> = {
  can_post_messages: "Publicar mensagens",
  can_edit_messages: "Editar mensagens",
  can_delete_messages: "Excluir mensagens",
  can_manage_chat: "Gerenciar chat",
  can_invite_users: "Convidar usuários",
  can_pin_messages: "Fixar mensagens",
  can_promote_members: "Promover membros",
  can_change_info: "Alterar informações",
  can_restrict_members: "Restringir membros",
}

// All permission keys we track, in display order.
export const ALL_PERMISSION_KEYS = Object.keys(PERMISSION_LABELS)
