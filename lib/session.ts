import "server-only"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
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
 * Returns the current session user or null. Does not redirect.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
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
