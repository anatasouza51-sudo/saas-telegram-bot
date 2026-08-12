"use client"

import { createContext, useCallback, useContext, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from "react"

type MobileMenuContextValue = {
  mobileMenuOpen: boolean
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>
  toggleMobileMenu: () => void
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null)

export function MobileMenuProvider({ children }: PropsWithChildren) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((previous) => !previous), [])

  return (
    <MobileMenuContext.Provider value={{ mobileMenuOpen, setMobileMenuOpen, toggleMobileMenu }}>
      {children}
    </MobileMenuContext.Provider>
  )
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext)
  if (!context) {
    throw new Error("useMobileMenu must be used within MobileMenuProvider")
  }
  return context
}
