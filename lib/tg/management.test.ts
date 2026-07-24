import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { notifyManagement } from "@/lib/tg/management"

const { getStoreTelegram, sendMessage } = vi.hoisted(() => ({
  getStoreTelegram: vi.fn(),
  sendMessage: vi.fn(),
}))

vi.mock("@/lib/tg/config", () => ({ getStoreTelegram }))

beforeEach(() => {
  vi.clearAllMocks()
  sendMessage.mockResolvedValue({ ok: true })
  getStoreTelegram.mockResolvedValue({
    client: { sendMessage },
    managementChatId: "-100999",
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("notifyManagement", () => {
  it("sends an icon-prefixed alert to the management group", async () => {
    await notifyManagement("store-1", "warning", "Estoque baixo", "Produto X: 2 restantes")

    expect(sendMessage).toHaveBeenCalledTimes(1)
    const [chatId, text] = sendMessage.mock.calls[0]
    expect(chatId).toBe("-100999")
    expect(text).toContain("⚠️ <b>Estoque baixo</b>")
    expect(text).toContain("Produto X: 2 restantes")
  })

  it("escapes user-provided content", async () => {
    await notifyManagement("store-1", "error", "<script>", "a & b")
    const [, text] = sendMessage.mock.calls[0]
    expect(text).toContain("&lt;script&gt;")
    expect(text).toContain("a &amp; b")
    expect(text).not.toContain("<script>")
  })

  it("omits the details block when there are none", async () => {
    await notifyManagement("store-1", "info", "Bot reiniciado")
    const [, text] = sendMessage.mock.calls[0]
    expect(text.startsWith("ℹ️ <b>Bot reiniciado</b>")).toBe(true)
  })

  it("no-ops when the store has no bot or no management group", async () => {
    getStoreTelegram.mockResolvedValueOnce({ client: null, managementChatId: "-1" })
    await notifyManagement("store-1", "info", "x")
    getStoreTelegram.mockResolvedValueOnce({ client: { sendMessage }, managementChatId: "" })
    await notifyManagement("store-1", "info", "x")
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it("swallows errors so the caller flow is never broken", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    getStoreTelegram.mockRejectedValueOnce(new Error("db down"))
    await expect(notifyManagement("store-1", "error", "x")).resolves.toBeUndefined()
    expect(log).toHaveBeenCalled()
  })
})
