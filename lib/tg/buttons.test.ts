import { describe, expect, it } from "vitest"
import {
  BUTTON_TYPE_LABELS,
  parseButtons,
  resolveButtonUrl,
  toInlineKeyboard,
  type ButtonRows,
  type PostButton,
} from "@/lib/tg/buttons"

const btn = (over: Partial<PostButton>): PostButton => ({
  text: "Abrir",
  type: "url",
  value: "https://example.com",
  ...over,
})

describe("resolveButtonUrl", () => {
  it("returns the trimmed raw value for link-like types", () => {
    for (const type of ["url", "site", "deeplink"] as const) {
      expect(resolveButtonUrl(btn({ type, value: "  https://x.com  " }))).toBe(
        "https://x.com",
      )
    }
  })

  it("builds t.me links from handles but keeps full URLs", () => {
    expect(resolveButtonUrl(btn({ type: "telegram", value: "@loja" }))).toBe(
      "https://t.me/loja",
    )
    expect(
      resolveButtonUrl(btn({ type: "telegram", value: "https://t.me/loja" })),
    ).toBe("https://t.me/loja")
  })

  it("strips non-digits from whatsapp numbers", () => {
    expect(
      resolveButtonUrl(btn({ type: "whatsapp", value: "+55 (11) 99999-8888" })),
    ).toBe("https://wa.me/5511999998888")
    expect(
      resolveButtonUrl(btn({ type: "whatsapp", value: "https://wa.me/551199" })),
    ).toBe("https://wa.me/551199")
  })

  it("builds instagram profile links", () => {
    expect(resolveButtonUrl(btn({ type: "instagram", value: "@loja" }))).toBe(
      "https://instagram.com/loja",
    )
    expect(
      resolveButtonUrl(
        btn({ type: "instagram", value: "https://instagram.com/loja" }),
      ),
    ).toBe("https://instagram.com/loja")
  })

  it("has no url for callback buttons", () => {
    expect(resolveButtonUrl(btn({ type: "callback", value: "buy:1" }))).toBe("")
  })

  it("labels every button type", () => {
    for (const type of Object.keys(BUTTON_TYPE_LABELS)) {
      expect(BUTTON_TYPE_LABELS[type as keyof typeof BUTTON_TYPE_LABELS]).toBeTruthy()
    }
  })
})

describe("toInlineKeyboard", () => {
  it("returns undefined when nothing is renderable", () => {
    expect(toInlineKeyboard([])).toBeUndefined()
    expect(toInlineKeyboard([[btn({ text: "  " })], []])).toBeUndefined()
  })

  it("maps callback buttons to callback_data and others to url", () => {
    const rows: ButtonRows = [
      [btn({ text: "Site", value: "https://x.com" })],
      [btn({ text: "Comprar", type: "callback", value: "buy:1" })],
    ]
    expect(toInlineKeyboard(rows)).toEqual({
      inline_keyboard: [
        [{ text: "Site", url: "https://x.com" }],
        [{ text: "Comprar", callback_data: "buy:1" }],
      ],
    })
  })

  it("truncates callback_data to Telegram's 64-byte limit", () => {
    const long = "x".repeat(100)
    const keyboard = toInlineKeyboard([
      [btn({ text: "Go", type: "callback", value: long })],
    ])
    expect(keyboard?.inline_keyboard[0][0]).toEqual({
      text: "Go",
      callback_data: "x".repeat(64),
    })
  })

  it("drops empty buttons and the rows left empty by them", () => {
    const keyboard = toInlineKeyboard([
      [btn({ text: "" }), btn({ text: "Ok", value: "https://ok.com" })],
      [btn({ value: "   " })],
    ])
    expect(keyboard).toEqual({
      inline_keyboard: [[{ text: "Ok", url: "https://ok.com" }]],
    })
  })
})

describe("parseButtons", () => {
  it("returns an empty list for nullish or invalid JSON", () => {
    expect(parseButtons(null)).toEqual([])
    expect(parseButtons(undefined)).toEqual([])
    expect(parseButtons("")).toEqual([])
    expect(parseButtons("{oops")).toEqual([])
  })

  it("returns an empty list when the payload is not an array", () => {
    expect(parseButtons(JSON.stringify({ text: "x" }))).toEqual([])
  })

  it("parses stored rows", () => {
    const rows: ButtonRows = [[btn({})]]
    expect(parseButtons(JSON.stringify(rows))).toEqual(rows)
  })
})
