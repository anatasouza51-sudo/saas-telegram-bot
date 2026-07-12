// Shared, framework-agnostic permission metadata. Kept free of "server-only"
// so both the discovery engine (server) and the panel (client) can import it.

// Admin permissions we consider required for the bot to fully operate a
// destination (post, edit, delete). When any are missing the panel shows a
// "sem permissões suficientes" status.
export const REQUIRED_PERMISSIONS = [
  "can_post_messages",
  "can_edit_messages",
  "can_delete_messages",
] as const

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
