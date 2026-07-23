"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tags, 
  Package, 
  ShoppingCart, 
  Truck, 
  CreditCard, 
  Users, 
  Send, 
  Megaphone, 
  Bot, 
  Settings, 
  ShieldAlert, 
  FileText, 
  CreditCard as GatewayIcon 
} from "lucide-react"

const menuItems = [
  { title: "Dashboard", href: "/app", icon: LayoutDashboard },
  { title: "Produtos", href: "/products", icon: Package },
  { title: "Categorias", href: "/categories", icon: Tags },
  { title: "Estoque", href: "/stock", icon: ShoppingBag },
  { title: "Pedidos", href: "/orders", icon: ShoppingCart },
  { title: "Entregas", href: "/deliveries", icon: Truck },
  { title: "Clientes", href: "/customers", icon: Users },
  { title: "Pagamentos", href: "/payments", icon: CreditCard },
  { title: "Telegram", href: "/telegram", icon: Send },
  { title: "Automações", href: "/automations", icon: Bot },
  { title: "Canais", href: "/channels", icon: Megaphone },
  { title: "Gateway", href: "/gateway", icon: GatewayIcon },
  { title: "Administradores", href: "/admins", icon: ShieldAlert },
  { title: "Logs", href: "/logs", icon: FileText },
  { title: "Configurações", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-card border-r flex flex-col h-screen">
      <div className="p-6 font-bold text-lg border-b">
        SaaS Telegram Bot
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
