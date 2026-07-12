export type NavItem = {
  title: string
  href: string
  icon: string
  // capability required to see this item; undefined = visible to all authed users
  capability?: string
  // short description shown in the section tab header
  description?: string
}

// A grouped section renders a single sidebar entry that opens a tabbed page.
export type NavSection = {
  title: string
  icon: string
  children: NavItem[]
}

export type NavNode = NavItem | NavSection

export function isSection(node: NavNode): node is NavSection {
  return (node as NavSection).children !== undefined
}

// Main navigation ("Operação"). Related pages are grouped into tabbed sections
// to keep the sidebar short and organized.
export const MAIN_NAV: NavNode[] = [
  { title: "Dashboard", href: "/", icon: "LayoutDashboard" },
  {
    title: "Catálogo",
    icon: "Package",
    children: [
      {
        title: "Produtos",
        href: "/products",
        icon: "Package",
        capability: "products.manage",
        description: "Gerencie seu catálogo de produtos digitais.",
      },
      {
        title: "Categorias",
        href: "/categories",
        icon: "FolderTree",
        capability: "products.manage",
        description: "Organize os produtos em categorias.",
      },
      {
        title: "Estoque",
        href: "/stock",
        icon: "Boxes",
        capability: "stock.manage",
        description: "Controle a quantidade disponível de cada produto.",
      },
    ],
  },
  {
    title: "Vendas",
    icon: "ShoppingCart",
    children: [
      {
        title: "Pedidos",
        href: "/orders",
        icon: "ShoppingCart",
        capability: "orders.view",
        description: "Acompanhe e gerencie os pedidos da loja.",
      },
      {
        title: "Clientes",
        href: "/customers",
        icon: "Users",
        capability: "customers.view",
        description: "Veja o histórico e os dados dos seus clientes.",
      },
      {
        title: "Pagamentos",
        href: "/payments",
        icon: "CreditCard",
        capability: "payments.view",
        description: "Acompanhe transações e conciliação financeira.",
      },
      {
        title: "Entregas",
        href: "/deliveries",
        icon: "Truck",
        capability: "orders.view",
        description: "Gerencie a entrega dos produtos digitais.",
      },
    ],
  },
  {
    title: "Divulgação",
    icon: "Megaphone",
    children: [
      {
        title: "Postagens",
        href: "/posts",
        icon: "Megaphone",
        capability: "posts.manage",
        description:
          "Crie mensagens com mídia e botões, agende disparos e acompanhe o histórico.",
      },
      {
        title: "Mídias",
        href: "/media",
        icon: "Images",
        capability: "posts.manage",
        description:
          "Arquivos armazenados no próprio Telegram via file_id. Nenhuma URL pública é usada.",
      },
      {
        title: "Grupos & Canais",
        href: "/channels",
        icon: "Radio",
        capability: "posts.manage",
        description:
          "Detecção automática: adicione o bot a um grupo ou canal e ele aparece aqui com status e permissões.",
      },
      {
        title: "Automações",
        href: "/automations",
        icon: "Zap",
        capability: "posts.manage",
        description:
          "Publique automaticamente quando eventos da loja acontecerem: novo produto, estoque, promoções.",
      },
    ],
  },
]

// System navigation ("Integrações & Sistema"). Intentionally left flat.
export const SYSTEM_NAV: NavItem[] = [
  { title: "Telegram Bot", href: "/telegram", icon: "Send", capability: "telegram.manage" },
  { title: "Gateway (VeoPag)", href: "/gateway", icon: "Wallet", capability: "gateway.manage" },
  { title: "Administradores", href: "/admins", icon: "ShieldCheck", capability: "admins.manage" },
  { title: "Logs", href: "/logs", icon: "ScrollText", capability: "logs.view" },
]

// Returns a section's tab list by its title (used by the tabbed layouts).
export function sectionTabs(title: string): NavItem[] {
  const section = MAIN_NAV.find(
    (node): node is NavSection => isSection(node) && node.title === title,
  )
  return section ? section.children : []
}

export { canSee } from "@/lib/roles"
