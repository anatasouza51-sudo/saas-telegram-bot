import "server-only"

/**
 * Resolves the public base URL of the app for building webhook endpoints.
 * Corrigido (M-1): Fail-closed em produção se nenhuma URL oficial estiver configurada,
 * impedindo registro de webhooks apontando para localhost.
 */
export function getAppBaseUrl(): string {
  const url = process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    process.env.V0_RUNTIME_URL

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[urls] ERRO CRÍTICO: Nenhuma URL base configurada (BETTER_AUTH_URL / VERCEL_URL). Webhooks não podem ser registrados com segurança.")
    }
    return "http://localhost:3000"
  }
  return url
}
