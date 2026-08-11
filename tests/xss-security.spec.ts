import { test, expect } from "@playwright/test"
import {
  renderTelegramHtml,
  renderTelegramMarkdown,
  sanitizeTelegramHtml,
  validateSafeUrl,
} from "../lib/html-safety"
import { renderVerificationEmail } from "../lib/email"

test.describe("XSS and HTML injection protections", () => {
  test("rejects javascript protocol", () => {
    expect(() => validateSafeUrl("javascript:alert(1)")).toThrow()
  })

  test("rejects uppercase javascript protocol", () => {
    expect(() => validateSafeUrl("JAVASCRIPT:alert(1)")).toThrow()
  })

  test("rejects control characters between protocol letters", () => {
    expect(() => validateSafeUrl("java\nscript:alert(1)")).toThrow()
  })

  test("rejects percent-encoded newline and tab protocol bypasses", () => {
    expect(() => validateSafeUrl("java%0ascript:alert(1)")).toThrow()
    expect(() => validateSafeUrl("java%09script:alert(1)")).toThrow()
  })

  test("rejects HTML entity encoded protocol bypasses", () => {
    expect(() => validateSafeUrl("java&#x73;cript:alert(1)")).toThrow()
  })

  test("rejects data and vbscript protocols", () => {
    expect(() => validateSafeUrl("data:text/html,<script>alert(1)</script>")).toThrow()
    expect(() => validateSafeUrl("vbscript:alert(1)")).toThrow()
  })

  test("allows the required absolute web protocols", () => {
    expect(validateSafeUrl("https://example.com")).toBe("https://example.com/")
    expect(validateSafeUrl("http://example.com")).toBe("http://example.com/")
  })

  test("allows only explicitly supported messaging protocols", () => {
    expect(validateSafeUrl("mailto:user@example.com")).toBe("mailto:user@example.com")
    expect(validateSafeUrl("tel:+5511999999999")).toBe("tel:+5511999999999")
    expect(validateSafeUrl("tg://resolve?domain=example")).toBe("tg://resolve?domain=example")
  })

  test("escapes scripts and event-handler elements in HTML", () => {
    const html = renderTelegramHtml('<script>alert(1)</script><img src=x onerror=alert(1)>texto')
    expect(html).not.toContain("<script")
    expect(html).not.toContain("<img")
    expect(html).not.toContain("onerror")
    expect(html).toContain("alert(1)texto")
  })

  test("drops unsafe hrefs and event attributes from allowed anchors", () => {
    const html = renderTelegramHtml('<a href="javascript:alert(1)" onclick="alert(2)">clique</a>')
    expect(html).not.toContain("<a")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("onclick")
    expect(html).toContain("clique")
  })

  test("validates and escapes safe anchor attributes", () => {
    const html = renderTelegramHtml('<a href="https://example.com/?a=1&b=2" data-x="ignored">clique</a>')
    expect(html).toContain('<a href="https://example.com/?a=1&amp;b=2"')
    expect(html).not.toContain("data-x")
  })

  test("normalizes HTML entities without double-encoding safe URLs", () => {
    const html = renderTelegramHtml('<a href="https://example.com/?a=1&amp;b=2">clique</a>')
    expect(html).toContain('<a href="https://example.com/?a=1&amp;b=2"')
    expect(html).not.toContain("&amp;amp;")
  })

  test("prevents href attribute breaking with quotes", () => {
    const html = renderTelegramHtml('<a href="https://example.com" onmouseover="alert(1)">clique</a>')
    expect(html).toContain('<a href="https://example.com/"')
    expect(html).not.toContain("onmouseover")
    expect(html).not.toContain("alert(1)")
  })

  test("removes unknown attributes while preserving supported formatting", () => {
    const html = sanitizeTelegramHtml('<strong class="user" data-value="x">Olá</strong><div onclick="alert(1)">x</div>')
    expect(html).toBe("<strong>Olá</strong>x")
  })

  test("does not create executable Markdown links from dangerous URLs", () => {
    const html = renderTelegramMarkdown("[clique](javascript:alert(1)) [outro](java%0ascript:alert(1))")
    expect(html).not.toContain('<a href="javascript:')
    expect(html).not.toContain("<a href")
    expect(html).toContain("clique")
    expect(html).toContain("outro")
  })

  test("creates Markdown links only for safe URLs", () => {
    const html = renderTelegramMarkdown("[site](https://example.com)")
    expect(html).toContain('<a href="https://example.com/"')
    expect(html).toContain(">site</a>")
  })

  test("accepts numeric Telegram custom emoji ids", () => {
    const html = renderTelegramHtml('<tg-emoji emoji-id="123456"></tg-emoji>')
    expect(html).toBe('<tg-emoji emoji-id="123456"></tg-emoji>')
  })

  test("rejects non-numeric and empty Telegram custom emoji ids", () => {
    for (const emojiId of ["abc", "123abc", "12 34", ""]) {
      const html = renderTelegramHtml(`<tg-emoji emoji-id="${emojiId}">`)
      expect(html).not.toContain("<tg-emoji")
    }
  })

  test("rejects injected Telegram custom emoji attributes", () => {
    for (const input of [
      '<tg-emoji emoji-id="123" onclick="alert(1)">',
      '<tg-emoji emoji-id="1&quot; onclick=&quot;alert(1)">',
      '<tg-emoji emoji-id="1\' onload=\'alert(1)">',
      '<tg-emoji emoji-id="<script>alert(1)</script>">',
    ]) {
      const html = renderTelegramHtml(input)
      expect(html).not.toContain("<tg-emoji")
      expect(html).not.toContain("onclick")
      expect(html).not.toContain("onload")
      expect(html).not.toContain("<script")
    }
  })

  test("sanitizes legacy HTML bodies through the duplicate-post sanitizer path", () => {
    // duplicatePost uses the same server-side sanitizer as savePost. Directly
    // invoking the database-backed action would require auth and a live DB.
    expect(sanitizeTelegramHtml('<a href="javascript:alert(1)">X</a>')).toBe("X</a>")
    expect(sanitizeTelegramHtml('<img src=x onerror=alert(1)>')).toBe("")
  })

  test("escapes verification email text and URL contexts", () => {
    const html = renderVerificationEmail({
      name: '<Admin> & "teste" \'',
      url: "https://example.com/verify?token=a&next=%2F",
    })
    expect(html).toContain("&lt;Admin&gt; &amp; &quot;teste&quot; &#39;")
    expect(html).toContain('href="https://example.com/verify?token=a&amp;next=%2F"')
    expect(html).not.toContain("<Admin>")
  })

  test("rejects dangerous verification URLs", () => {
    expect(() => renderVerificationEmail({ name: "user", url: "javascript:alert(1)" })).toThrow()
  })
})
