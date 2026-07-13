/**
 * PIX payment configuration — fully editable from the admin panel and stored
 * as a single JSON blob under the settings key `pix.config` (per store).
 *
 * This module is pure data (no server-only deps) so it can be safely imported
 * by both server code and client components (the admin form).
 *
 * Every button has both a `text` (label) and an `enabled` flag, so the admin
 * can rename OR hide any button without touching code.
 */

export type PixButton = { text: string; enabled: boolean }

export type PixConfig = {
  // Text shown right above the PIX copy-paste code.
  aboveCodeText: string
  copyButton: PixButton
  verifyButton: PixButton
  cancelButton: PixButton
  supportButton: PixButton
  // Minutes until the charge expires (used for countdown + expired state).
  expireMinutes: number
  // Message shown once the payment is approved.
  approvedMessage: string
  // Message shown once the charge expires without payment.
  expiredMessage: string
}

export const DEFAULT_PIX_CONFIG: PixConfig = {
  aboveCodeText: "Copie o código PIX abaixo e pague no app do seu banco:",
  copyButton: { text: "📋 Copiar código PIX", enabled: true },
  verifyButton: { text: "🔄 Já efetuei o pagamento", enabled: true },
  cancelButton: { text: "❌ Cancelar pedido", enabled: true },
  supportButton: { text: "💬 Suporte", enabled: false },
  expireMinutes: 30,
  approvedMessage: "✅ Pagamento aprovado! Estamos entregando o seu produto.",
  expiredMessage:
    "⏰ Este pagamento expirou. Faça um novo pedido para gerar outro PIX.",
}

/** Safely parses the stored JSON blob, always returning a complete config. */
export function parsePixConfig(raw: string | null | undefined): PixConfig {
  if (!raw) return { ...DEFAULT_PIX_CONFIG }
  try {
    const parsed = JSON.parse(raw) as Partial<PixConfig>
    return {
      aboveCodeText:
        typeof parsed.aboveCodeText === "string" && parsed.aboveCodeText.trim()
          ? parsed.aboveCodeText
          : DEFAULT_PIX_CONFIG.aboveCodeText,
      copyButton: mergeButton(parsed.copyButton, DEFAULT_PIX_CONFIG.copyButton),
      verifyButton: mergeButton(
        parsed.verifyButton,
        DEFAULT_PIX_CONFIG.verifyButton,
      ),
      cancelButton: mergeButton(
        parsed.cancelButton,
        DEFAULT_PIX_CONFIG.cancelButton,
      ),
      supportButton: mergeButton(
        parsed.supportButton,
        DEFAULT_PIX_CONFIG.supportButton,
      ),
      expireMinutes:
        typeof parsed.expireMinutes === "number" &&
        parsed.expireMinutes >= 5 &&
        parsed.expireMinutes <= 1440
          ? Math.round(parsed.expireMinutes)
          : DEFAULT_PIX_CONFIG.expireMinutes,
      approvedMessage:
        typeof parsed.approvedMessage === "string" &&
        parsed.approvedMessage.trim()
          ? parsed.approvedMessage
          : DEFAULT_PIX_CONFIG.approvedMessage,
      expiredMessage:
        typeof parsed.expiredMessage === "string" &&
        parsed.expiredMessage.trim()
          ? parsed.expiredMessage
          : DEFAULT_PIX_CONFIG.expiredMessage,
    }
  } catch {
    return { ...DEFAULT_PIX_CONFIG }
  }
}

function mergeButton(
  b: Partial<PixButton> | undefined,
  fallback: PixButton,
): PixButton {
  if (!b || typeof b !== "object") return { ...fallback }
  return {
    text: typeof b.text === "string" && b.text.trim() ? b.text : fallback.text,
    enabled: typeof b.enabled === "boolean" ? b.enabled : fallback.enabled,
  }
}
