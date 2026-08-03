"use client"

import { SectionHeader } from "./section-header"
import type { NavItem } from "@/lib/nav"

/**
 * @deprecated Use SectionHeader instead. This component is kept for backward compatibility.
 */
export function SectionTabs({
  section,
  tabs,
}: {
  section: string
  tabs: NavItem[]
}) {
  return <SectionHeader section={section} tabs={tabs} />
}
