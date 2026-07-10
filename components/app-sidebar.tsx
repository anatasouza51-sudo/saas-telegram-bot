"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NAV_ITEMS, canSee } from "@/lib/nav"
import { ROLE_LABELS, type Role } from "@/lib/session"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  CreditCard,
  Truck,
  Send,
  Wallet,
  ShieldCheck,
  ScrollText,
  Bot,
  type LucideIcon,
} from "lucide-react"
import { UserMenu } from "@/components/user-menu"

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  CreditCard,
  Truck,
  Send,
  Wallet,
  ShieldCheck,
  ScrollText,
}

export function AppSidebar({
  user,
}: {
  user: { name: string; email: string; role: Role }
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => canSee(user.role, item.capability))

  const mainItems = items.filter(
    (i) => !["/telegram", "/gateway", "/admins", "/logs"].includes(i.href),
  )
  const systemItems = items.filter((i) =>
    ["/telegram", "/gateway", "/admins", "/logs"].includes(i.href),
  )

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none text-sidebar-foreground">
              BotStore
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              Painel de Vendas
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {systemItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Integrações & Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemItems.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard
                  const active = pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu
          name={user.name}
          email={user.email}
          roleLabel={ROLE_LABELS[user.role]}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
