import { describe, expect, it } from "vitest"
import { isSection, MAIN_NAV, sectionTabs, SYSTEM_NAV, type NavItem } from "@/lib/nav"
import { PERMISSIONS } from "@/lib/roles"

const itemsOf = (): NavItem[] =>
  MAIN_NAV.flatMap((node) => (isSection(node) ? node.children : [node]))

describe("isSection", () => {
  it("distinguishes grouped sections from leaf items", () => {
    expect(isSection({ title: "Dashboard", href: "/", icon: "X" })).toBe(false)
    expect(isSection({ title: "Catálogo", icon: "X", children: [] })).toBe(true)
  })
})

describe("navigation tree", () => {
  it("gives every item a unique href and an icon", () => {
    const items = [...itemsOf(), ...SYSTEM_NAV]
    const hrefs = items.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    for (const item of items) {
      expect(item.href.startsWith("/")).toBe(true)
      expect(item.icon).toBeTruthy()
    }
  })

  it("only references capabilities that exist in the permission matrix", () => {
    for (const item of [...itemsOf(), ...SYSTEM_NAV]) {
      if (item.capability) expect(PERMISSIONS).toHaveProperty(item.capability)
    }
  })

  it("keeps the system navigation flat", () => {
    for (const item of SYSTEM_NAV) {
      expect(isSection(item)).toBe(false)
    }
  })
})

describe("sectionTabs", () => {
  it("returns the children of a known section", () => {
    expect(sectionTabs("Catálogo").map((t) => t.href)).toEqual([
      "/products",
      "/categories",
      "/stock",
    ])
    expect(sectionTabs("Vendas")).toHaveLength(4)
    expect(sectionTabs("Divulgação")).toHaveLength(3)
  })

  it("returns an empty list for a leaf item or an unknown title", () => {
    expect(sectionTabs("Dashboard")).toEqual([])
    expect(sectionTabs("Nada")).toEqual([])
  })
})
