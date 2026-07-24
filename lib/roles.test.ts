import { describe, expect, it } from "vitest"
import {
  can,
  canSee,
  PERMISSIONS,
  ROLE_LABELS,
  ROLES,
  type Role,
} from "@/lib/roles"

describe("role metadata", () => {
  it("labels every role", () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy()
    }
  })

  it("only references known roles in the permission matrix", () => {
    for (const allowed of Object.values(PERMISSIONS)) {
      for (const role of allowed) {
        expect(ROLES).toContain(role)
      }
    }
  })
})

describe("can", () => {
  it("grants admin every capability, including unknown ones", () => {
    for (const capability of Object.keys(PERMISSIONS)) {
      expect(can("admin", capability)).toBe(true)
    }
    expect(can("admin", "totally.unknown")).toBe(true)
  })

  it("respects the matrix for non-admin roles", () => {
    expect(can("products", "products.manage")).toBe(true)
    expect(can("products", "stock.manage")).toBe(true)
    expect(can("products", "payments.manage")).toBe(false)
    expect(can("finance", "payments.manage")).toBe(true)
    expect(can("support", "customers.manage")).toBe(true)
    expect(can("support", "orders.manage")).toBe(false)
  })

  it("denies unknown capabilities for non-admin roles", () => {
    const nonAdmins: Role[] = ["products", "finance", "support"]
    for (const role of nonAdmins) {
      expect(can(role, "does.not.exist")).toBe(false)
    }
  })

  it("restricts admin-only capabilities to admin", () => {
    for (const capability of ["telegram.manage", "admins.manage", "logs.view", "settings.manage"]) {
      expect(can("finance", capability)).toBe(false)
      expect(can("products", capability)).toBe(false)
      expect(can("support", capability)).toBe(false)
    }
  })
})

describe("canSee", () => {
  it("is permissive when no capability is required", () => {
    expect(canSee("support")).toBe(true)
    expect(canSee("support", undefined)).toBe(true)
  })

  it("delegates to can when a capability is given", () => {
    expect(canSee("support", "logs.view")).toBe(false)
    expect(canSee("admin", "logs.view")).toBe(true)
  })
})
