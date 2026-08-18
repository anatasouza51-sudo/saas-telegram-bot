"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  BarChart3,
  Bell,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Store,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"

const ADMIN_NAV = [
  { href: "/admin", label: "Visão geral", shortLabel: "Início", icon: LayoutDashboard },
  { href: "/admin/sales", label: "Vendas", shortLabel: "Vendas", icon: BarChart3 },
  { href: "/admin/commission", label: "Comissões", shortLabel: "Comissões", icon: CircleDollarSign },
  { href: "/admin/members", label: "Membros", shortLabel: "Membros", icon: UsersRound },
  { href: "/admin/orders", label: "Pedidos", shortLabel: "Pedidos", icon: ClipboardList },
  { href: "/admin/gateways", label: "Gateways", shortLabel: "Gateways", icon: WalletCards },
  { href: "/admin/reports", label: "Relatórios", shortLabel: "Relatórios", icon: FileBarChart },
  { href: "/admin/audit", label: "Auditoria", shortLabel: "Auditoria", icon: ShieldCheck },
  { href: "/admin/settings", label: "Configurações", shortLabel: "Mais", icon: Settings2 },
]

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function BrandMark() {
  return (
    <Link href="/admin" className="flex items-center gap-3" aria-label="DYNORBOT Admin">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-admin-lime/30 bg-admin-lime/10 text-admin-lime shadow-[0_0_28px_rgba(169,201,127,0.12)]">
        <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block font-space text-[10px] font-black uppercase tracking-[0.25em] text-admin-copper">Control plane</span>
        <span className="block truncate text-lg font-black tracking-[-0.04em] text-white">DYNORBOT <span className="text-admin-lime">ADMIN</span></span>
      </span>
    </Link>
  )
}

function NavItem({ href, label, icon: Icon, collapsed = false, onNavigate }: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href)
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
        active
          ? "bg-admin-lime text-admin-ink shadow-[0_10px_26px_rgba(169,201,127,0.14)]"
          : "text-white/60 hover:bg-white/[0.06] hover:text-white"
      } ${collapsed ? "justify-center px-2" : ""}`}
      title={collapsed ? label : undefined}
    >
      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-admin-ink" : "text-admin-lime/80"}`} strokeWidth={1.8} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && active && <ChevronRight className="ml-auto h-4 w-4" />}
    </Link>
  )
}

export function AdminShell({ children, user }: { children: ReactNode; user: { name: string; email: string } }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const signOut = async () => {
    await authClient.signOut()
    window.location.href = "/admin/login"
  }

  return (
    <div className="min-h-screen bg-admin-ink text-white">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.08] bg-admin-sidebar/95 px-4 py-5 backdrop-blur-xl transition-[width] duration-200 lg:flex lg:flex-col ${collapsed ? "w-[92px]" : "w-[276px]"}`}>
        <div className={`flex items-center pb-8 ${collapsed ? "justify-center" : "justify-between"}`}>
          {collapsed ? (
            <Link href="/admin" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-admin-lime/30 bg-admin-lime/10 text-admin-lime" aria-label="DYNORBOT Admin">
              <ShieldCheck className="h-5 w-5" />
            </Link>
          ) : <BrandMark />}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={`rounded-xl p-2 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white ${collapsed ? "hidden" : ""}`}
            aria-label="Recolher navegação administrativa"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mb-6 self-center rounded-xl p-2 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Expandir navegação administrativa"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <div className="mb-4 px-2 font-space text-[10px] font-black uppercase tracking-[0.24em] text-admin-copper/80">
          {collapsed ? "ADM" : "Operação da plataforma"}
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1" aria-label="Navegação administrativa">
          {ADMIN_NAV.map((item) => <NavItem key={item.href} {...item} collapsed={collapsed} />)}
        </nav>

        <div className={`mt-5 border-t border-white/[0.08] pt-4 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <div className={`mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 ${collapsed ? "justify-center" : ""}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-admin-lime/20 bg-admin-lime/10 text-admin-lime">
              <Store className="h-4 w-4" />
            </span>
            {!collapsed && <span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{user.name}</span><span className="block truncate text-[11px] text-white/40">{user.email}</span></span>}
          </div>
          <button type="button" onClick={signOut} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-white/50 transition-colors hover:bg-admin-copper/10 hover:text-admin-copper ${collapsed ? "justify-center" : ""}`} title={collapsed ? "Sair" : undefined}>
            <LogOut className="h-[18px] w-[18px]" />
            {!collapsed && "Sair do Admin"}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-[86%] max-w-[340px] border-r border-white/[0.08] bg-admin-sidebar px-5 py-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between pb-8"><BrandMark /><button type="button" onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-white/50" aria-label="Fechar menu"><X className="h-5 w-5" /></button></div>
            <div className="mb-4 px-2 font-space text-[10px] font-black uppercase tracking-[0.24em] text-admin-copper/80">Operação da plataforma</div>
            <nav className="flex flex-col gap-1" aria-label="Navegação administrativa mobile">
              {ADMIN_NAV.map((item) => <NavItem key={item.href} {...item} onNavigate={() => setMobileOpen(false)} />)}
            </nav>
          </div>
        </div>
      )}

      <div className="min-h-screen lg:pl-[276px]">
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-admin-ink/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/70 lg:hidden" aria-label="Abrir menu administrativo"><Menu className="h-5 w-5" /></button>
              <div className="lg:hidden"><BrandMark /></div>
              <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/35 lg:flex"><ShieldCheck className="h-4 w-4 text-admin-lime" /> Ambiente administrativo</div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden rounded-full border border-admin-lime/20 bg-admin-lime/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-admin-lime sm:inline-flex">Produção protegida</span>
              <button type="button" className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/55 transition-colors hover:text-white" aria-label="Notificações administrativas"><Bell className="h-4 w-4" /></button>
              <button type="button" onClick={signOut} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/55 transition-colors hover:border-admin-copper/40 hover:text-admin-copper" aria-label="Sair do Admin"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-69px)] max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>

        <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-1 rounded-3xl border border-white/[0.10] bg-admin-sidebar/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden" aria-label="Navegação administrativa rápida">
          {ADMIN_NAV.slice(0, 4).map(({ href, shortLabel, icon: Icon }) => {
            const active = isActive(pathname, href)
            return <Link key={href} href={href} className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold ${active ? "bg-admin-lime text-admin-ink" : "text-white/55"}`}><Icon className="h-4 w-4" /><span className="truncate">{shortLabel}</span></Link>
          })}
          <button type="button" onClick={() => setMobileOpen(true)} className="flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold text-white/55"><Menu className="h-4 w-4" /><span>Mais</span></button>
        </nav>
      </div>
    </div>
  )
}
