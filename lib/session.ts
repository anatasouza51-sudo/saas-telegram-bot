import "server-only"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export type Role = "admin" | "products" | "finance" | "support"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
}

/**
 * Returns the current session user or null. Does not redirect.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const u = session.user as typeof session.user & { role?: string }
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role as Role) || "support",
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
 * Permission matrix. Each capability lists the roles allowed to perform it.
 * "admin" implicitly has every permission.
 */
const PERMISSIONS: Record<string, Role[]> = {
  "products.manage": ["admin", "products"],
  "stock.manage": ["admin", "products"],
  "orders.view": ["admin", "finance", "support"],
  "orders.manage": ["admin", "finance"],
  "payments.view": ["admin", "finance"],
  "payments.manage": ["admin", "finance"],
  "customers.view": ["admin", "finance", "support"],
  "customers.manage": ["admin", "support"],
  "gateway.manage": ["admin", "finance"],
  "telegram.manage": ["admin"],
  "admins.manage": ["admin"],
  "logs.view": ["admin"],
  "settings.manage": ["admin"],
}

export function can(role: Role, capability: keyof typeof PERMISSIONS | string) {
  if (role === "admin") return true
  const allowed = PERMISSIONS[capability]
  return allowed ? allowed.includes(role) : false
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

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador Principal",
  products: "Gerenciador de Produtos",
  finance: "Gerenciador Financeiro",
  support: "Suporte",
}
