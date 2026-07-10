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
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <Separator orientation="vertical" className="h-6 md:hidden" />
        <div>
          <h1 className="text-lg font-semibold text-foreground text-balance">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
