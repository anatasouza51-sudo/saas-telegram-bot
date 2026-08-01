import "server-only"
import { cache } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import { redirect } from "next/navigation"
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
 * Reads the Clerk user from the server context and looks up the
 * corresponding row in our `user` table to get role/ownerId/storeId.
 * `cache()` deduplicates calls within a single request/render.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (!email) return null

    // Look up the app-level user record in our DB (synced from Clerk).
    // Match by Clerk ID first (primary), then by email as fallback for existing users.
    const [record] = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        ownerId: userTable.ownerId,
      })
      .from(userTable)
      .where(or(
        eq(userTable.id, clerkUser.id),
        eq(userTable.email, email as string),
      ))
      .limit(1)

    if (!record) return null

    const ownerId = record.ownerId ?? null
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      role: (record.role as Role) || "support",
      ownerId,
      storeId: ownerId ?? record.id,
    }
  } catch (error) {
    console.error("[getSessionUser] Session lookup failed:", error)
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
