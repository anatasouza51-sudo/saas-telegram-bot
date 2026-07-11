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
  { title: "Categorias", href: "/categories", icon: "FolderTree", capability: "products.manage" },
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

export { canSee } from "@/lib/roles"
