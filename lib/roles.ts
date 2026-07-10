// Client-safe role definitions, labels and permission matrix.
// No server-only imports here so this can be used by client components.

export type Role = "admin" | "products" | "finance" | "support"

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador Principal",
  products: "Gerenciador de Produtos",
  finance: "Gerenciador Financeiro",
  support: "Suporte",
}

export const ROLES: Role[] = ["admin", "products", "finance", "support"]

/**
 * Permission matrix. Each capability lists the roles allowed to perform it.
 * "admin" implicitly has every permission.
 */
export const PERMISSIONS: Record<string, Role[]> = {
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

export function can(role: Role, capability: string) {
  if (role === "admin") return true
  const allowed = PERMISSIONS[capability]
  return allowed ? allowed.includes(role) : false
}

export function canSee(role: Role, capability?: string) {
  if (!capability) return true
  return can(role, capability)
}
