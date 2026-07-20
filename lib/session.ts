import "server-only"
import { cookies } from "next/headers"
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
 * Builds a Cookie header string from next/headers cookies().
 */
async function buildCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  const entries = cookieStore.getAll()
  return entries.map((c) => `${c.name}=${c.value}`).join("; ")
}

/**
 * Returns the current session user or null. Does not redirect.
 * Uses HTTP fetch to /api/auth/get-session to avoid Next.js 16
 * compatibility issues with auth.api.getSession() in SSR contexts.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieHeader = await buildCookieHeader()
    if (!cookieHeader) return null

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    const res = await fetch(
      `${baseUrl}/api/auth/get-session`,
      {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      },
    )
    
    if (!res.ok) {
      console.error("[getSessionUser] Fetch failed:", res.status, res.statusText)
      return null
    }

    const data = await res.json() as any
    if (!data?.user) return null

    const u = data.user
    const ownerId = (u as any).ownerId ?? null
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: ((u as any).role as Role) || "support",
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
