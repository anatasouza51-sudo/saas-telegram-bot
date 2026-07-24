import { beforeEach, describe, expect, it, vi } from "vitest"
import { enqueuePost, resolveTargets } from "@/lib/tg/queue"

type ChatRow = {
  chatId: string
  type: string
  botIsAdmin: boolean
  status: string
  purpose: string
}

const { state, insertValues, updateSet } = vi.hoisted(() => ({
  state: { chatRows: [] as unknown[] },
  insertValues: vi.fn(),
  updateSet: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => state.chatRows }) }),
    insert: () => ({ values: insertValues }),
    update: () => ({
      set: (values: unknown) => {
        updateSet(values)
        return { where: async () => undefined }
      },
    }),
  },
}))
vi.mock("@/lib/tg/config", () => ({ getStoreTelegram: vi.fn() }))
vi.mock("@/lib/tg/send", () => ({ sendPost: vi.fn() }))
vi.mock("@/lib/tg/management", () => ({ notifyManagement: vi.fn() }))

const chat = (over: Partial<ChatRow>): ChatRow => ({
  chatId: "-100",
  type: "channel",
  botIsAdmin: true,
  status: "active",
  purpose: "audience",
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  insertValues.mockResolvedValue(undefined)
  state.chatRows = [
    chat({ chatId: "-1", type: "channel" }),
    chat({ chatId: "-2", type: "supergroup" }),
    chat({ chatId: "-3", type: "group", status: "inactive" }),
    chat({ chatId: "-4", type: "group", botIsAdmin: false }),
    chat({ chatId: "-5", type: "channel", purpose: "cdn" }),
  ]
})

describe("resolveTargets", () => {
  it("expands 'all' to every usable chat", async () => {
    expect(await resolveTargets("store-1", ["all"])).toEqual(["-1", "-2"])
  })

  it("filters by kind with all_groups / all_channels", async () => {
    expect(await resolveTargets("store-1", ["all_channels"])).toEqual(["-1"])
    expect(await resolveTargets("store-1", ["all_groups"])).toEqual(["-2"])
  })

  it("keeps only explicitly requested chats otherwise", async () => {
    expect(await resolveTargets("store-1", ["-2"])).toEqual(["-2"])
    expect(await resolveTargets("store-1", ["-1", "-2"])).toEqual(["-1", "-2"])
  })

  it("skips inactive chats, non-admin chats and non-audience purposes", async () => {
    expect(await resolveTargets("store-1", ["-3", "-4", "-5"])).toEqual([])
  })

  it("de-duplicates overlapping specs", async () => {
    expect(await resolveTargets("store-1", ["all_channels", "-1"])).toEqual(["-1"])
  })

  it("returns nothing for an empty spec", async () => {
    expect(await resolveTargets("store-1", [])).toEqual([])
  })
})

describe("enqueuePost", () => {
  it("creates one pending row per resolved chat and marks the post queued", async () => {
    const scheduledFor = new Date("2024-01-01T10:00:00Z")
    const count = await enqueuePost({
      storeId: "store-1",
      postId: 7,
      targets: ["all"],
      scheduleId: 3,
      scheduledFor,
    })

    expect(count).toBe(2)
    expect(insertValues).toHaveBeenCalledWith([
      {
        ownerId: "store-1",
        postId: 7,
        scheduleId: 3,
        chatId: "-1",
        scheduledFor,
        status: "pending",
      },
      {
        ownerId: "store-1",
        postId: 7,
        scheduleId: 3,
        chatId: "-2",
        scheduledFor,
        status: "pending",
      },
    ])
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "queued" }),
    )
  })

  it("defaults the schedule fields when omitted", async () => {
    await enqueuePost({ storeId: "store-1", postId: 7, targets: ["-1"] })
    const [rows] = insertValues.mock.calls[0]
    expect(rows[0].scheduleId).toBeNull()
    expect(rows[0].scheduledFor).toBeInstanceOf(Date)
  })

  it("writes nothing when no target resolves", async () => {
    expect(
      await enqueuePost({ storeId: "store-1", postId: 7, targets: ["-3"] }),
    ).toBe(0)
    expect(insertValues).not.toHaveBeenCalled()
    expect(updateSet).not.toHaveBeenCalled()
  })
})
