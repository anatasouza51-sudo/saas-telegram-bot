import { describe, expect, it, vi } from "vitest"
import type { TelegramChatMember } from "@/lib/telegram"
import {
  computeStatus,
  grantedPermissions,
  isPresent,
  isRealChatType,
  isValidChatRow,
  missingPermissions,
} from "@/lib/tg/discovery"

vi.mock("@/lib/db", () => ({ db: {} }))

const member = (
  status: TelegramChatMember["status"],
  perms: Record<string, boolean> = {},
): TelegramChatMember =>
  ({ status, user: { id: 1, is_bot: true, first_name: "bot" }, ...perms }) as TelegramChatMember

const fullChannelAdmin = member("administrator", {
  can_post_messages: true,
  can_edit_messages: true,
  can_delete_messages: true,
})

describe("isRealChatType", () => {
  it("accepts only groups, supergroups and channels", () => {
    expect(isRealChatType("group")).toBe(true)
    expect(isRealChatType("supergroup")).toBe(true)
    expect(isRealChatType("channel")).toBe(true)
    expect(isRealChatType("private")).toBe(false)
    expect(isRealChatType(undefined)).toBe(false)
    expect(isRealChatType(null)).toBe(false)
  })
})

describe("isValidChatRow", () => {
  it("rejects private chats", () => {
    expect(isValidChatRow("private", "42", 42)).toBe(false)
  })

  it("rejects the bot's own chat, comparing ids as strings", () => {
    expect(isValidChatRow("group", "42", 42)).toBe(false)
    expect(isValidChatRow("group", 42, 42)).toBe(false)
  })

  it("accepts real chats, with or without a known bot id", () => {
    expect(isValidChatRow("channel", "-100123", 42)).toBe(true)
    expect(isValidChatRow("channel", "-100123", null)).toBe(true)
  })
})

describe("grantedPermissions", () => {
  it("gives the creator every permission relevant to the chat type", () => {
    expect(grantedPermissions(member("creator"), "channel")).toContain("can_post_messages")
    expect(grantedPermissions(member("creator"), "group")).not.toContain("can_post_messages")
  })

  it("lists only the flags an administrator actually has", () => {
    expect(grantedPermissions(fullChannelAdmin, "channel")).toEqual([
      "can_post_messages",
      "can_edit_messages",
      "can_delete_messages",
    ])
  })

  it("ignores channel-only flags in groups", () => {
    expect(grantedPermissions(fullChannelAdmin, "supergroup")).toEqual([
      "can_delete_messages",
    ])
  })

  it("returns nothing for plain members", () => {
    expect(grantedPermissions(member("member"), "channel")).toEqual([])
    expect(grantedPermissions(member("left"), "channel")).toEqual([])
  })
})

describe("missingPermissions", () => {
  it("is empty for a fully-privileged channel admin and for the creator", () => {
    expect(missingPermissions(fullChannelAdmin, "channel")).toEqual([])
    expect(missingPermissions(member("creator"), "channel")).toEqual([])
  })

  it("lists the required flags that are not granted", () => {
    const partial = member("administrator", { can_post_messages: true })
    expect(missingPermissions(partial, "channel")).toEqual([
      "can_edit_messages",
      "can_delete_messages",
    ])
  })

  it("only requires deletion in groups", () => {
    expect(missingPermissions(member("administrator", { can_delete_messages: true }), "group")).toEqual([])
    expect(missingPermissions(member("administrator"), "group")).toEqual([
      "can_delete_messages",
    ])
  })

  it("treats every required flag as missing for non-admins", () => {
    expect(missingPermissions(member("member"), "channel")).toHaveLength(3)
  })
})

describe("isPresent", () => {
  it("is false only once the bot left or was kicked", () => {
    expect(isPresent("administrator")).toBe(true)
    expect(isPresent("member")).toBe(true)
    expect(isPresent("creator")).toBe(true)
    expect(isPresent("left")).toBe(false)
    expect(isPresent("kicked")).toBe(false)
  })
})

describe("computeStatus", () => {
  it("reports removed when the bot is gone", () => {
    expect(computeStatus(member("left"), "channel")).toBe("removed")
    expect(computeStatus(member("kicked"), "group")).toBe("removed")
  })

  it("reports member when the bot is not an admin", () => {
    expect(computeStatus(member("member"), "channel")).toBe("member")
    expect(computeStatus(member("restricted"), "group")).toBe("member")
  })

  it("reports insufficient when required permissions are missing", () => {
    expect(computeStatus(member("administrator", { can_post_messages: true }), "channel")).toBe(
      "insufficient",
    )
  })

  it("reports online once every required permission is granted", () => {
    expect(computeStatus(fullChannelAdmin, "channel")).toBe("online")
    expect(computeStatus(fullChannelAdmin, "supergroup")).toBe("online")
    expect(computeStatus(member("creator"), "channel")).toBe("online")
  })
})
