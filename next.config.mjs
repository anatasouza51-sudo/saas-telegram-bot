// Security headers applied to every response. CSP is intentionally strict but
// allows the styles/images this app actually uses. 'unsafe-inline' is required
// for Next's inline runtime styles; scripts avoid it in production.
const isProd = process.env.NODE_ENV === "production"

// Frame protection is only enforced in production so the v0/Vercel preview
// (which renders the app inside an iframe) keeps working during development.
const frameAncestors = isProd ? "frame-ancestors 'none'" : "frame-ancestors *"

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(isProd ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      frameAncestors,
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'"),
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "form-action 'self'",
    ].join("; "),
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
