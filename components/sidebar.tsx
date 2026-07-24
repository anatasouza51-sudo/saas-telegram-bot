"use client"

import { useState } from "react"
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
  LogOut,
  Menu,
  X
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
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Botão de Menu para Celular (Aciona com os três pontinhos/hambúrguer) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-[#0b0e14] border border-zinc-800 text-zinc-200 shadow-lg"
        aria-label="Abrir Menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay escuro no fundo quando aberto no mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Barra Lateral / Cápsula de Ícones */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen py-4 flex flex-col items-center justify-between
        transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:h-screen md:py-6
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Container em formato de cápsula com borda contornando tudo */}
        <div className="flex flex-col items-center justify-between w-20 h-full bg-[#07090e] border border-zinc-800/80 rounded-2xl py-4 shadow-2xl mx-3 my-auto">
          
          {/* Topo: Sua Logo */}
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
            👻
          </div>

          {/* Navegação por Ícones */}
          <nav className="flex flex-col items-center gap-2 w-full px-2 my-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.name}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/80"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              )
            })}
          </nav>

          {/* Rodapé: Perfil e Sair */}
          <div className="flex flex-col items-center gap-3 w-full px-2 pt-2 border-t border-zinc-800/60">
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

        </div>
      </aside>
    </>
  )
}
