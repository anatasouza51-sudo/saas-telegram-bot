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
  // PageHeader is now minimal and only shows actions if provided
  if (!actions) return null
  
  return (
    <header className="sticky top-[73px] z-10 flex items-center justify-end border-b border-white/5 bg-[#0a0a0a] px-6 py-3 lg:px-8">
      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
        {actions}
      </div>
    </header>
  )
}
