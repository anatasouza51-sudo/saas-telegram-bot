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
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a] px-6 py-4 lg:px-8">
      <div className="flex items-center gap-4">
        {/* Title removed for cleaner UI as requested */}
      </div>
      {actions && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
          {actions}
        </div>
      )}
    </header>
  )
}
