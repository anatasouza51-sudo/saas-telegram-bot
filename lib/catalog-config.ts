export type CatalogButton = {
  text: string
  enabled: boolean
}

export type CatalogConfig = {
  buyButton: CatalogButton
  couponButton: CatalogButton
  backButton: CatalogButton
}

export const DEFAULT_CATALOG_CONFIG: CatalogConfig = {
  buyButton: { text: "🛍️ Comprar", enabled: true },
  couponButton: { text: "🎟️ Aplicar Cupom", enabled: true },
  backButton: { text: "⬅️ Voltar", enabled: true },
}

export function parseCatalogConfig(json: string | null | undefined): CatalogConfig {
  if (!json) return DEFAULT_CATALOG_CONFIG
  try {
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== "object") return DEFAULT_CATALOG_CONFIG

    return {
      buyButton: {
        text: typeof parsed.buyButton?.text === "string" ? parsed.buyButton.text : DEFAULT_CATALOG_CONFIG.buyButton.text,
        enabled: typeof parsed.buyButton?.enabled === "boolean" ? parsed.buyButton.enabled : DEFAULT_CATALOG_CONFIG.buyButton.enabled,
      },
      couponButton: {
        text: typeof parsed.couponButton?.text === "string" ? parsed.couponButton.text : DEFAULT_CATALOG_CONFIG.couponButton.text,
        enabled: typeof parsed.couponButton?.enabled === "boolean" ? parsed.couponButton.enabled : DEFAULT_CATALOG_CONFIG.couponButton.enabled,
      },
      backButton: {
        text: typeof parsed.backButton?.text === "string" ? parsed.backButton.text : DEFAULT_CATALOG_CONFIG.backButton.text,
        enabled: typeof parsed.backButton?.enabled === "boolean" ? parsed.backButton.enabled : DEFAULT_CATALOG_CONFIG.backButton.enabled,
      },
    }
  } catch (err) {
    console.error("[CatalogConfig] parse failed, using defaults:", err)
    return DEFAULT_CATALOG_CONFIG
  }
}

export function serializeCatalogConfig(config: CatalogConfig): string {
  return JSON.stringify(config)
}
