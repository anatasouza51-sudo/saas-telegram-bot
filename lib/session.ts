import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { can, ROLES, type Role } from "@/lib/roles"
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
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
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
      image?: string | null
    }
    if (!u.id) return null

    // A sessão só é aceita quando o registro atual do usuário é confirmado no banco.
    // Role, ownerId e demais atributos de autorização nunca são obtidos de claims antigas.
    type CurrentDbUser = {
      id: string
      name: string
      email: string
      image: string | null
      role: string | null
      ownerId: string | null
      onboardingSeen: boolean | null
    }

    // Usamos timeout para evitar que uma consulta lenta mantenha uma autorização ambígua.
    let dbUser: CurrentDbUser | undefined
    try {
      dbUser = await new Promise<typeof dbUser>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("[getSessionUser] DB query timeout after 8s"))
        }, 8000)
        
        db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            image: userTable.image,
            role: userTable.role,
            ownerId: userTable.ownerId,
            onboardingSeen: userTable.onboardingSeen,
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
      // Falha de infraestrutura não pode virar autorização permissiva.
      console.error("[getSessionUser] DB query failed; denying session", dbErr instanceof Error ? dbErr.name : "unknown")
      return null
    }

    if (!dbUser) return null
    if (!ROLES.includes(dbUser.role as Role)) {
      console.error("[getSessionUser] User has invalid role; denying session")
      return null
    }

    const ownerId = dbUser.ownerId ?? null
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      image: dbUser.image,
      role: dbUser.role as Role,
      ownerId,
      storeId: ownerId ?? dbUser.id,
      onboardingSeen: dbUser.onboardingSeen ?? false,
    }
  } catch {
    console.error("[getSessionUser] Session lookup failed")
    return null
  }
})

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
