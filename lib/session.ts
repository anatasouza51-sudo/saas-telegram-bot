import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { can, type Role } from "@/lib/roles"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
export type { Role } from "@/lib/roles"

export type SessionUser = {
  id: string
  name: string
  email: string
  image?: string | null
  role: Role
  ownerId: string | null
  storeId: string
  onboardingSeen: boolean
}

/**
 * Returns the current session user or null. Does not redirect.
 */
// Correção de isolamento entre contas:
// A função NÃO usa mais `cache(...)` do React, pois o cache compartilhado por
// requisição do Next.js (request-scope) podia ser reutilizado entre contas
// quando o mesmo runtime processava requisições concorrentes, fazendo o
// SessionUser (ownerId/storeId) da Conta A ser servido à Conta B.
// Agora cada requisição valida a própria sessão a partir dos seus cookies.
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const entries = cookieStore.getAll()
    if (!entries.length) return null

    const hasSessionCookie = entries.some((c) =>
      c.name.startsWith("better-auth.session_token")
    )
    const cookieHeader = entries.map((c) => `${c.name}=${c.value}`).join("; ")
    if (process.env.NODE_ENV === "production") {
      console.log("[getSessionUser] Cookies encontrados:", entries.map(c => c.name).join(", "))
    }
    const h = new Headers()
    h.set("cookie", cookieHeader)

    // Desabilitar cache para garantir dados frescos após atualizações
    const session = await auth.api.getSession({ 
      headers: h,
      query: {
        disableCookieCache: true
      }
    })
    
    if (!session?.user) {
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "[getSessionUser] Cookie de sessao presente mas invalido/expirado",
          "(hasSessionCookie:", hasSessionCookie,
          "| cookies:", entries.map((c) => c.name).join(","), ")"
        )
      }
      return null
    }

    const u = session.user as typeof session.user & {
      role?: string
      ownerId?: string | null
      image?: string | null
      onboardingSeen?: boolean
    }
    
    // Se por algum motivo o Better Auth ainda retornar o nome antigo da sessão,
    // buscamos diretamente no banco de dados para garantir a verdade absoluta.
    // Usamos Promise.race para garantir timeout se o banco estiver lento.
    let dbUser: { name: string; image: string | null; onboardingSeen: boolean | null } | undefined
    try {
      dbUser = await new Promise<typeof dbUser>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("[getSessionUser] DB query timeout after 8s"))
        }, 8000)
        
        db
          .select({ 
            name: userTable.name, 
            image: userTable.image, 
            onboardingSeen: userTable.onboardingSeen 
          })
          .from(userTable)
          .where(eq(userTable.id, u.id))
          .limit(1)
          .then((result) => {
            clearTimeout(timeout)
            resolve(result[0] || undefined)
          })
          .catch((err) => {
            clearTimeout(timeout)
            reject(err)
          })
      })
    } catch (dbErr) {
      // Se o banco falhar, usamos os dados da sessão como fallback
      console.warn("[getSessionUser] DB query failed, using session data as fallback:", dbErr)
    }

    const ownerId = u.ownerId ?? null
    return {
      id: u.id,
      name: dbUser?.name || u.name,
      email: u.email,
      image: dbUser?.image || u.image,
      role: (u.role as Role) || "support",
      ownerId,
      storeId: ownerId ?? u.id,
      onboardingSeen: dbUser?.onboardingSeen ?? false,
    }
  } catch (error) {
    console.error("[getSessionUser] Session lookup failed:", error)
    return null
  }
}

/**
 * Requires an authenticated user. Redirects to /sign-in otherwise.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")
  return user
}

/**
 * Requires the given capability. Throws if the user lacks permission.
 */
export async function requireCapability(capability: string): Promise<SessionUser> {
  const user = await requireUser()
  if (!can(user.role, capability)) {
    throw new Error("Você não tem permissão para executar esta ação.")
  }
  return user
}
