import { escapeHtml, validateSafeUrl } from "./html-safety"

export type VerificationEmailInput = {
  name?: string | null
  url: string
}

/**
 * Renders the verification email without allowing user-controlled values to
 * alter either HTML text nodes or the href attribute.
 */
export function renderVerificationEmail({ name, url }: VerificationEmailInput): string {
  const safeUrl = validateSafeUrl(url, "URL de verificação")
  if (!safeUrl) throw new Error("URL de verificação inválida.")

  const safeName = escapeHtml(name || "")
  const escapedHref = escapeHtml(safeUrl)
  const escapedVisibleUrl = escapeHtml(safeUrl)

  return `<p>Olá ${safeName},</p><p>Clique para confirmar seu email:</p><p><a href="${escapedHref}">${escapedVisibleUrl}</a></p>`
}
