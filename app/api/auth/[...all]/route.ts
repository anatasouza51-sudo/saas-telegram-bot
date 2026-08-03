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
    dbReady = false
  }
}

export const { GET, POST } = toNextJsHandler(
  new Proxy(auth.handler, {
    apply(target, thisArg, args) {
      return Promise.resolve(ensureDb()).then(() =>
        target.apply(thisArg, args as any)
      )
    },
  }) as typeof auth.handler
)
