// Single source of truth for the "function" (purpose) a detected chat can have.
//
// The internal value "audience" is the posting destination and is relied upon
// by lib/tg/queue.ts, the post editor, and automations — it maps to the
// user-facing label "Canal de Postagens". Do not rename the stored value.
//
// Exclusivity: some roles only make sense for a single chat at a time (there is
// one private CDN, one management group, one backup group). Selecting an
// exclusive role for a chat clears it from any other chat.

export type ChatPurpose =
  | "audience"
  | "cdn"
  | "management"
  | "logs"
  | "backups"
  | "notifications"
  | "other"

export type PurposeMeta = {
  value: ChatPurpose
  /** User-facing label (Portuguese). */
  label: string
  /** Short description shown in the selector. */
  description: string
  /** Whether only one chat may hold this role at a time. */
  exclusive: boolean
}

export const PURPOSES: PurposeMeta[] = [
  {
    value: "audience",
    label: "Canal de Postagens",
    description: "Recebe as postagens e campanhas enviadas pelo bot.",
    exclusive: false,
  },
  {
    value: "cdn",
    label: "Canal CDN (Cache)",
    description: "Armazena mídias para reenvio rápido. Apenas um.",
    exclusive: true,
  },
  {
    value: "management",
    label: "Grupo de Gerenciamento",
    description: "Comandos administrativos e controle. Apenas um.",
    exclusive: true,
  },
  {
    value: "logs",
    label: "Grupo de Logs",
    description: "Registra eventos e atividades do bot.",
    exclusive: false,
  },
  {
    value: "backups",
    label: "Grupo de Backups",
    description: "Recebe cópias de segurança. Apenas um.",
    exclusive: true,
  },
  {
    value: "notifications",
    label: "Grupo de Notificações",
    description: "Recebe alertas e avisos do sistema.",
    exclusive: false,
  },
  {
    value: "other",
    label: "Outro",
    description: "Sem função específica definida.",
    exclusive: false,
  },
]

export const PURPOSE_VALUES = PURPOSES.map((p) => p.value)

export const EXCLUSIVE_PURPOSES = PURPOSES.filter((p) => p.exclusive).map(
  (p) => p.value,
)

const PURPOSE_BY_VALUE = new Map(PURPOSES.map((p) => [p.value, p]))

export function getPurposeMeta(value: string): PurposeMeta {
  return PURPOSE_BY_VALUE.get(value as ChatPurpose) ?? PURPOSES[0]
}

export function isValidPurpose(value: string): value is ChatPurpose {
  return PURPOSE_BY_VALUE.has(value as ChatPurpose)
}

export function isExclusivePurpose(value: string): boolean {
  return EXCLUSIVE_PURPOSES.includes(value as ChatPurpose)
}
