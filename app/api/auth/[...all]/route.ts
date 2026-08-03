import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { ensureDbStructure } from "@/lib/db/migrate"

let dbReady = false

async function ensureDb() {
  if (dbReady) return
  try {
    await ensureDbStructure()
    dbReady = true
  } catch (err) {
    console.error("[auth route] Falha ao garantir estrutura do banco:", err)
    // Não bloqueia — tenta novamente na próxima request
    dbReady = false
  }
}

export const { GET, POST } = toNextJsHandler(
  new Proxy(auth.handler, {
    apply(target, thisArg, args) {
      // Garantir que o banco está pronto antes de qualquer request de auth
      return Promise.resolve(ensureDb()).then(() =>
        target.apply(thisArg, args as any)
      )
    },
  }) as typeof auth.handler
)
