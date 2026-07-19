import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-white/5 bg-[#0a0a0a]/60 px-6 py-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between lg:px-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-primary md:hidden" />
        <Separator orientation="vertical" className="h-8 bg-white/10 md:hidden" />
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm font-medium text-muted-foreground/80">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
          {actions}
        </div>
      )}
    </header>
  )
}
