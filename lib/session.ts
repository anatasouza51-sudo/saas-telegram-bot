import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { can, type Role } from "@/lib/roles"
export type { Role } from "@/lib/roles"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
  ownerId: string | null
  storeId: string
}

/**
 * Returns the current session user or null. Does not redirect.
 *
 * Works around Next.js 16.2.x compatibility issue where
 * auth.api.getSession({ headers: await headers() }) crashes in SSR
 * because Next.js HeadersReadonly is incompatible with new Headers()
 * inside better-auth's dispatch layer.
 *
 * Solution: build a plain Headers object from cookies() and pass it
 * directly, bypassing the problematic Next.js headers() helper.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const entries = cookieStore.getAll()
    if (!entries.length) return null

    const cookieHeader = entries.map((c) => `${c.name}=${c.value}`).join("; ")
    const h = new Headers()
    h.set("cookie", cookieHeader)

    const session = await auth.api.getSession({ headers: h })
    if (!session?.user) return null

    const u = session.user as typeof session.user & {
      role?: string
      ownerId?: string | null
    }
    const ownerId = u.ownerId ?? null
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: (u.role as Role) || "support",
      ownerId,
      storeId: ownerId ?? u.id,
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
