import { createHmac } from "crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  clientIpFrom,
  escapeHtml,
  generateSecret,
  hmacSha256,
  rateLimit,
  safeEqual,
} from "@/lib/security"

describe("generateSecret", () => {
  it("produces URL-safe secrets of the requested entropy", () => {
    const secret = generateSecret()
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/)
    // 32 bytes base64url -> 43 chars
    expect(secret).toHaveLength(43)
    expect(generateSecret(8)).toHaveLength(11)
  })

  it("does not repeat", () => {
    expect(generateSecret()).not.toBe(generateSecret())
  })
})

describe("safeEqual", () => {
  it("matches identical strings", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true)
    expect(safeEqual("", "")).toBe(true)
  })

  it("rejects different values and length mismatches", () => {
    expect(safeEqual("abc123", "abc124")).toBe(false)
    expect(safeEqual("abc", "abcd")).toBe(false)
  })

  it("rejects non-string input", () => {
    expect(safeEqual(undefined as unknown as string, "abc")).toBe(false)
    expect(safeEqual("abc", 123 as unknown as string)).toBe(false)
  })
})

describe("hmacSha256", () => {
  it("matches a reference digest", () => {
    const expected = createHmac("sha256", "s3cret").update("payload").digest("hex")
    expect(hmacSha256("s3cret", "payload")).toBe(expected)
  })

  it("changes when the secret or the payload changes", () => {
    const base = hmacSha256("s3cret", "payload")
    expect(hmacSha256("other", "payload")).not.toBe(base)
    expect(hmacSha256("s3cret", "payload!")).not.toBe(base)
  })
})

describe("escapeHtml", () => {
  it("escapes every character that breaks Telegram HTML", () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe(
      "&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;",
    )
  })

  it("escapes ampersands before other entities", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;")
  })

  it("stringifies non-string input and maps nullish to empty", () => {
    expect(escapeHtml(42)).toBe("42")
    expect(escapeHtml(null)).toBe("")
    expect(escapeHtml(undefined)).toBe("")
  })
})

describe("rateLimit", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows up to max requests inside the window, then blocks", () => {
    const key = `test-${Math.random()}`
    expect(rateLimit(key, { max: 2, windowMs: 1000 }).ok).toBe(true)
    expect(rateLimit(key, { max: 2, windowMs: 1000 }).ok).toBe(true)
    const blocked = rateLimit(key, { max: 2, windowMs: 1000 })
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it("keeps separate counters per key", () => {
    const a = `a-${Math.random()}`
    const b = `b-${Math.random()}`
    expect(rateLimit(a, { max: 1, windowMs: 1000 }).ok).toBe(true)
    expect(rateLimit(a, { max: 1, windowMs: 1000 }).ok).toBe(false)
    expect(rateLimit(b, { max: 1, windowMs: 1000 }).ok).toBe(true)
  })

  it("resets once the window elapses", () => {
    vi.useFakeTimers()
    const key = `window-${Math.random()}`
    expect(rateLimit(key, { max: 1, windowMs: 1000 }).ok).toBe(true)
    expect(rateLimit(key, { max: 1, windowMs: 1000 }).ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit(key, { max: 1, windowMs: 1000 }).ok).toBe(true)
  })
})

describe("clientIpFrom", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://example.com", { headers })

  it("uses the first entry of x-forwarded-for", () => {
    expect(clientIpFrom(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe(
      "1.2.3.4",
    )
  })

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIpFrom(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9")
    expect(clientIpFrom(req({}))).toBe("unknown")
  })
})
