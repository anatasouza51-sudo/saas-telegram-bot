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
  // PageHeader é minimal e só mostra actions se fornecidas
  if (!actions) return null

  return (
    <header className="sticky top-14 z-10 flex items-center justify-end border-b border-white/5 bg-[#0a0a0a] px-3 sm:px-4 md:px-8 py-2 sm:py-3 lg:top-[73px]">
      <div className="flex items-center gap-2 sm:gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
        {actions}
      </div>
    </header>
  )
}
