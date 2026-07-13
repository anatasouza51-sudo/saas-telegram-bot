import "server-only"
import QRCode from "qrcode"

// Re-export the (client-safe) config helpers so existing server imports of
// "@/lib/pix" keep working, while the QR generation below stays server-only.
export {
  DEFAULT_PIX_CONFIG,
  parsePixConfig,
  type PixConfig,
  type PixButton,
} from "@/lib/pix-config"

/**
 * Renders the PIX EMV copy-paste code into a PNG QR Code (Buffer). The QR is
 * generated EXCLUSIVELY from the gateway's official code — never a static or
 * fictional QR. Returns null if the code is empty.
 */
export async function generatePixQrPng(
  pixCode: string,
): Promise<Buffer | null> {
  const code = pixCode?.trim()
  if (!code) return null
  return QRCode.toBuffer(code, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#000000", light: "#FFFFFF" },
  })
}

/** Renders the PIX code into a data URL (for the web payment page <img>). */
export async function generatePixQrDataUrl(
  pixCode: string,
): Promise<string | null> {
  const code = pixCode?.trim()
  if (!code) return null
  return QRCode.toDataURL(code, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#000000", light: "#FFFFFF" },
  })
}
