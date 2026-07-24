"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Megaphone, 
  Send, 
  Wallet, 
  Users, 
  FileText,
  LogOut
} from "lucide-react"

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Produtos", href: "/products", icon: Package },
  { name: "Vendas", href: "/orders", icon: ShoppingCart },
  { name: "Divulgação", href: "/posts", icon: Megaphone },
  { name: "Telegram", href: "/telegram", icon: Send },
  { name: "Gateway", href: "/gateway", icon: Wallet },
  { name: "Clientes", href: "/customers", icon: Users },
  { name: "Logs", href: "/logs", icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col items-center justify-between w-16 h-screen bg-[#07090e] border-r border-zinc-800/80 py-4 fixed left-0 top-0 z-50">
      {/* Topo: Logo / Ícone do Bot */}
      <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/20">
        👻
      </div>

      {/* Navegação por Ícones */}
      <nav className="flex flex-col items-center gap-2 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.name} // Tooltip nativo ao passar o mouse
              className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800"
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          )
        })}
      </nav>

      {/* Rodapé: Perfil e Sair */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <div 
          title="rokie (Admin)"
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center text-white font-semibold justify-center text-sm shadow-inner cursor-pointer"
        >
          R
        </div>
        <button 
          title="Sair"
          className="flex items-center justify-center w-10 h-10 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
