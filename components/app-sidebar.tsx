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
import {
  MAIN_NAV,
  SYSTEM_NAV,
  isSection,
  canSee,
  type NavItem,
  type NavNode,
} from "@/lib/nav"
import { ROLE_LABELS, type Role } from "@/lib/roles"
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
  Megaphone,
  Radio,
  Images,
  Zap,
  FolderTree,
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
  Megaphone,
  Radio,
  Images,
  Zap,
  FolderTree,
}

export function AppSidebar({
  user,
}: {
  user: { name: string; email: string; role: Role }
}) {
  const pathname = usePathname()

  // Filters a section's children to those the current role can see.
  function visibleChildren(children: NavItem[]) {
    return children.filter((c) => canSee(user.role, c.capability))
  }

  // A single link is active on exact ("/") or prefix match.
  function isItemActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
  }

  // Renders one top-level node: either a plain link or a grouped section that
  // points to its first visible tab and stays active across all its routes.
  function renderNode(node: NavNode) {
    if (!isSection(node)) {
      if (!canSee(user.role, node.capability)) return null
      const Icon = ICONS[node.icon] ?? LayoutDashboard
      return (
        <SidebarMenuItem key={node.href}>
          <SidebarMenuButton
            isActive={isItemActive(node.href)}
            render={
              <Link href={node.href}>
                <Icon className="h-4 w-4" />
                <span>{node.title}</span>
              </Link>
            }
          />
        </SidebarMenuItem>
      )
    }

    const children = visibleChildren(node.children)
    if (children.length === 0) return null
    const Icon = ICONS[node.icon] ?? LayoutDashboard
    const landing = children[0].href
    const active = children.some((c) => pathname.startsWith(c.href))
    return (
      <SidebarMenuItem key={node.title}>
        <SidebarMenuButton
          isActive={active}
          render={
            <Link href={landing}>
              <Icon className="h-4 w-4" />
              <span>{node.title}</span>
            </Link>
          }
        />
      </SidebarMenuItem>
    )
  }

  const systemItems = SYSTEM_NAV.filter((i) => canSee(user.role, i.capability))

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
            <SidebarMenu>{MAIN_NAV.map((node) => renderNode(node))}</SidebarMenu>
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
                      <SidebarMenuButton
                        isActive={active}
                        render={
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        }
                      />
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
