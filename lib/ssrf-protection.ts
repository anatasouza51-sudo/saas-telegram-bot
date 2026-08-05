import "server-only"

/**
 * SSRF protection: validates URLs before fetching them.
 * Blocks private networks, loopback, metadata services, and non-HTTP protocols.
 *
 * Used by: upload route (imageUrl), webhook registration, and any external fetch.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254", // AWS metadata
  "169.254.170.2",   // ECS metadata
  "10.0.0.1",
  "metadata.google.internal",
  "instance-data",
  "metadata",
])

const BLOCKED_DOMAIN_SUFFIXES = [".local", ".internal", ".lan", ".home.arpa", ".invalid", ".test"]

/**
 * Parses and validates a URL, rejecting private/internal addresses.
 * Returns the validated URL string or throws.
 */
export function validateFetchUrl(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("URL inválida")
  const trimmed = raw.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Protocolo não permitido (use HTTPS)")
  }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error("URL inválida")
  }
  const hostname = parsed.hostname.toLowerCase()
  // Block exact matches
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("Endereço privado não permitido")
  }
  // Block known internal suffixes
  for (const suffix of BLOCKED_DOMAIN_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      throw new Error("Endereço privado não permitido")
    }
  }
  // Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
  const parts = hostname.split(".")
  if (parts.length === 4) {
    const first = Number(parts[0])
    const second = Number(parts[1])
    if (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 127) ||
      (first === 0)
    ) {
      throw new Error("Endereço privado não permitido")
    }
  }
  return trimmed
}

/**
 * Safe fetch wrapper with SSRF protection and timeout.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  validateFetchUrl(url)
  // Add a timeout to prevent hanging on slow/malicious endpoints
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000) // 10s timeout
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
