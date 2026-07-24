/** Best-effort human message for an unknown thrown value. */
export function getErrorMessage(error: unknown, fallback = "Erro inesperado") {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return fallback
}
