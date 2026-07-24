import { describe, expect, it } from "vitest"
import {
  DEFAULT_PIX_CONFIG,
  parsePixConfig,
  serializePixConfig,
} from "@/lib/pix-config"

describe("parsePixConfig", () => {
  it("returns a copy of the defaults for empty input", () => {
    for (const raw of [null, undefined, ""]) {
      const config = parsePixConfig(raw)
      expect(config).toEqual(DEFAULT_PIX_CONFIG)
      expect(config).not.toBe(DEFAULT_PIX_CONFIG)
    }
  })

  it("returns the defaults for malformed JSON", () => {
    expect(parsePixConfig("{not json")).toEqual(DEFAULT_PIX_CONFIG)
  })

  it("keeps valid overrides", () => {
    const config = parsePixConfig(
      JSON.stringify({
        aboveCodeText: "Pague aqui",
        copyButton: { text: "Copiar", enabled: false },
        expireMinutes: 60,
        approvedMessage: "Ok!",
        expiredMessage: "Expirou",
      }),
    )
    expect(config.aboveCodeText).toBe("Pague aqui")
    expect(config.copyButton).toEqual({ text: "Copiar", enabled: false })
    expect(config.expireMinutes).toBe(60)
    expect(config.approvedMessage).toBe("Ok!")
    expect(config.expiredMessage).toBe("Expirou")
  })

  it("falls back to defaults for blank or wrongly typed text fields", () => {
    const config = parsePixConfig(
      JSON.stringify({
        aboveCodeText: "   ",
        approvedMessage: 5,
        expiredMessage: null,
      }),
    )
    expect(config.aboveCodeText).toBe(DEFAULT_PIX_CONFIG.aboveCodeText)
    expect(config.approvedMessage).toBe(DEFAULT_PIX_CONFIG.approvedMessage)
    expect(config.expiredMessage).toBe(DEFAULT_PIX_CONFIG.expiredMessage)
  })

  it("clamps expireMinutes to the 5..1440 range and rounds it", () => {
    expect(parsePixConfig(JSON.stringify({ expireMinutes: 4 })).expireMinutes).toBe(
      DEFAULT_PIX_CONFIG.expireMinutes,
    )
    expect(
      parsePixConfig(JSON.stringify({ expireMinutes: 1441 })).expireMinutes,
    ).toBe(DEFAULT_PIX_CONFIG.expireMinutes)
    expect(
      parsePixConfig(JSON.stringify({ expireMinutes: "30" })).expireMinutes,
    ).toBe(DEFAULT_PIX_CONFIG.expireMinutes)
    expect(
      parsePixConfig(JSON.stringify({ expireMinutes: 45.6 })).expireMinutes,
    ).toBe(46)
  })

  it("merges partial and invalid buttons with their defaults", () => {
    const config = parsePixConfig(
      JSON.stringify({
        copyButton: { enabled: false },
        verifyButton: { text: "  " },
        cancelButton: "nope",
        supportButton: { text: "Falar com suporte", enabled: "yes" },
      }),
    )
    expect(config.copyButton).toEqual({
      text: DEFAULT_PIX_CONFIG.copyButton.text,
      enabled: false,
    })
    expect(config.verifyButton).toEqual(DEFAULT_PIX_CONFIG.verifyButton)
    expect(config.cancelButton).toEqual(DEFAULT_PIX_CONFIG.cancelButton)
    expect(config.supportButton).toEqual({
      text: "Falar com suporte",
      enabled: DEFAULT_PIX_CONFIG.supportButton.enabled,
    })
  })
})

describe("serializePixConfig", () => {
  it("round-trips a valid config", () => {
    expect(JSON.parse(serializePixConfig(DEFAULT_PIX_CONFIG))).toEqual(
      DEFAULT_PIX_CONFIG,
    )
  })

  it("sanitizes out-of-range values before persisting", () => {
    const stored = JSON.parse(
      serializePixConfig({ ...DEFAULT_PIX_CONFIG, expireMinutes: 99999 }),
    )
    expect(stored.expireMinutes).toBe(DEFAULT_PIX_CONFIG.expireMinutes)
  })
})
