import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { TelegramClient } from "@/lib/telegram"
import {
  clearFileUrlCache,
  getFileUrl,
  invalidateFileUrl,
} from "@/lib/tg/file-url-cache"

const clientWith = (getFileUrlImpl: ReturnType<typeof vi.fn>) =>
  ({ getFileUrl: getFileUrlImpl }) as unknown as TelegramClient

describe("getFileUrl cache", () => {
  beforeEach(() => {
    clearFileUrlCache()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearFileUrlCache()
  })

  it("resolves through the client on a miss and caches the result", async () => {
    const resolve = vi.fn().mockResolvedValue("https://api.telegram.org/file/x.jpg")
    const client = clientWith(resolve)

    expect(await getFileUrl(client, "file-1")).toBe("https://api.telegram.org/file/x.jpg")
    expect(await getFileUrl(client, "file-1")).toBe("https://api.telegram.org/file/x.jpg")
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it("keys the cache by file_id", async () => {
    const resolve = vi.fn(async (id: string) => `https://files/${id}`)
    const client = clientWith(resolve as unknown as ReturnType<typeof vi.fn>)

    expect(await getFileUrl(client, "a")).toBe("https://files/a")
    expect(await getFileUrl(client, "b")).toBe("https://files/b")
    expect(resolve).toHaveBeenCalledTimes(2)
  })

  it("does not cache a failed resolution", async () => {
    const resolve = vi.fn().mockResolvedValue(null)
    const client = clientWith(resolve)

    expect(await getFileUrl(client, "file-1")).toBeNull()
    expect(await getFileUrl(client, "file-1")).toBeNull()
    expect(resolve).toHaveBeenCalledTimes(2)
  })

  it("re-resolves once the entry expires", async () => {
    vi.useFakeTimers()
    const resolve = vi.fn().mockResolvedValue("https://files/x")
    const client = clientWith(resolve)

    await getFileUrl(client, "file-1")
    vi.advanceTimersByTime(49 * 60 * 1000)
    await getFileUrl(client, "file-1")
    expect(resolve).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2 * 60 * 1000)
    await getFileUrl(client, "file-1")
    expect(resolve).toHaveBeenCalledTimes(2)
  })

  it("invalidates a single entry without touching the others", async () => {
    const resolve = vi.fn(async (id: string) => `https://files/${id}`)
    const client = clientWith(resolve as unknown as ReturnType<typeof vi.fn>)

    await getFileUrl(client, "a")
    await getFileUrl(client, "b")
    invalidateFileUrl("a")

    await getFileUrl(client, "a")
    await getFileUrl(client, "b")
    expect(resolve).toHaveBeenCalledTimes(3)
  })

  it("clears every entry", async () => {
    const resolve = vi.fn().mockResolvedValue("https://files/x")
    const client = clientWith(resolve)

    await getFileUrl(client, "a")
    clearFileUrlCache()
    await getFileUrl(client, "a")
    expect(resolve).toHaveBeenCalledTimes(2)
  })
})
