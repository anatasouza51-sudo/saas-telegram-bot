import { describe, expect, it } from "vitest"
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_LABELS,
  REQUIRED_PERMISSIONS,
  relevantPermissionsForType,
  requiredPermissionsForType,
} from "@/lib/tg/permissions"

const CHANNEL_ONLY = ["can_post_messages", "can_edit_messages"]

describe("permission metadata", () => {
  it("labels every tracked key", () => {
    for (const key of ALL_PERMISSION_KEYS) {
      expect(PERMISSION_LABELS[key]).toBeTruthy()
    }
    expect(ALL_PERMISSION_KEYS).toEqual(Object.keys(PERMISSION_LABELS))
  })

  it("tracks every required permission", () => {
    for (const key of REQUIRED_PERMISSIONS) {
      expect(ALL_PERMISSION_KEYS).toContain(key)
    }
  })
})

describe("requiredPermissionsForType", () => {
  it("requires posting, editing and deleting in channels", () => {
    expect(requiredPermissionsForType("channel")).toEqual([
      "can_post_messages",
      "can_edit_messages",
      "can_delete_messages",
    ])
  })

  it("only requires deleting in groups and for unknown types", () => {
    for (const type of ["group", "supergroup", "private", undefined, null]) {
      expect(requiredPermissionsForType(type)).toEqual(["can_delete_messages"])
    }
  })
})

describe("relevantPermissionsForType", () => {
  it("counts every key for channels", () => {
    expect(relevantPermissionsForType("channel")).toEqual(ALL_PERMISSION_KEYS)
  })

  it("excludes channel-only keys for groups", () => {
    const relevant = relevantPermissionsForType("supergroup")
    for (const key of CHANNEL_ONLY) {
      expect(relevant).not.toContain(key)
    }
    expect(relevant).toHaveLength(ALL_PERMISSION_KEYS.length - CHANNEL_ONLY.length)
  })
})
