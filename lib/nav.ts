import type { Role } from "@/lib/session"

export type NavItem = {
  title: string
  href: string
  icon: string
  // capability required to see this item; undefined = visible to all authed users
  capability?: string
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { title: "Produtos", href: "/products", icon: "Package", capability: "products.manage" },
  { title: "Estoque", href: "/stock", icon: "Boxes", capability: "stock.manage" },
  { title: "Pedidos", href: "/orders", icon: "ShoppingCart", capability: "orders.view" },
  { title: "Clientes", href: "/customers", icon: "Users", capability: "customers.view" },
  { title: "Pagamentos", href: "/payments", icon: "CreditCard", capability: "payments.view" },
  { title: "Entregas", href: "/deliveries", icon: "Truck", capability: "orders.view" },
  { title: "Telegram Bot", href: "/telegram", icon: "Send", capability: "telegram.manage" },
  { title: "Gateway (VeoPag)", href: "/gateway", icon: "Wallet", capability: "gateway.manage" },
  { title: "Administradores", href: "/admins", icon: "ShieldCheck", capability: "admins.manage" },
  { title: "Logs", href: "/logs", icon: "ScrollText", capability: "logs.view" },
]

// A minimal client-safe capability check mirroring lib/session.ts
const PERMISSIONS: Record<string, Role[]> = {
  "products.manage": ["admin", "products"],
  "stock.manage": ["admin", "products"],
  "orders.view": ["admin", "finance", "support"],
  "customers.view": ["admin", "finance", "support"],
  "payments.view": ["admin", "finance"],
  "gateway.manage": ["admin", "finance"],
  "telegram.manage": ["admin"],
  "admins.manage": ["admin"],
  "logs.view": ["admin"],
}

export function canSee(role: Role, capability?: string) {
  if (!capability) return true
  if (role === "admin") return true
  return PERMISSIONS[capability]?.includes(role) ?? false
}
