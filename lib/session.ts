import "server-only"
import { auth } from "@/lib/auth"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { can, type Role } from "@/lib/roles"
export type { Role } from "@/lib/roles"
export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
  ownerId: string | null
  /** The tenant/store this user belongs to. Owners are their own store. */
  storeId: string
}

/**
 * Build a Cookie header string from next/headers cookies().
 * Works around Next.js 16 compatibility issues with headers()
 * in certain rendering contexts (PRR, edge, etc.).
 */
async function buildCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  const entries = cookieStore.getAll()
  return entries.map(c => `${c.name}=${c.value}`).join("; ")
}

/**
 * Returns the current session user or null. Does not redirect.
 * Uses cookie header built from cookies() for better Next.js 16 compatibility.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieHeader = await buildCookieHeader()
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    })
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
    // If the session lookup fails (e.g. database error, secret mismatch,
    // cookie signature failure), treat the user as unauthenticated and
    // redirect to sign-in instead of crashing the whole page.
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
