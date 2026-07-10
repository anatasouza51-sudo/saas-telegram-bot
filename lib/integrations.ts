import "server-only"

/**
 * Secret credentials are read exclusively from environment variables and are
 * NEVER exposed to the client. These helpers only run on the server.
 */

export const telegramConfig = {
  get botToken() {
    return process.env.TELEGRAM_BOT_TOKEN ?? ""
  },
  get webhookSecret() {
    return process.env.TELEGRAM_WEBHOOK_SECRET ?? ""
  },
  get isConfigured() {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN)
  },
}

export const veopagConfig = {
  get apiKey() {
    return process.env.VEOPAG_API_KEY ?? ""
  },
  get secretKey() {
    return process.env.VEOPAG_SECRET_KEY ?? ""
  },
  get isConfigured() {
    return Boolean(process.env.VEOPAG_API_KEY && process.env.VEOPAG_SECRET_KEY)
  },
}

/** Masks a secret for safe display, e.g. "abcd…wxyz" or "não definido". */
export function maskSecret(value: string | undefined) {
  if (!value) return null
  if (value.length <= 8) return "••••••••"
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}
