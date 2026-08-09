// Security headers applied to every response. CSP is intentionally strict but
// allows the styles/images this app actually uses. 'unsafe-inline' is required
// for Next's inline runtime styles; scripts avoid it in production.

// SECURITY (Low-14): Mitigação do 'unsafe-inline' em script-src.
// O Next.js gera scripts inline cujo hash muda a cada build, então a abordagem
// prática e recomendada é usar 'strict-dynamic' em produção: scripts carregados
// por um script confiável (o loader do Next) são permitidos, mas scripts estáticos
// injetados diretamente no HTML por terceiros são bloqueados. O 'unsafe-inline'
// permanece apenas como fallback para navegadores antigos que não suportam
// strict-dynamic, com efeito neutralizado quando strict-dynamic está presente.
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
      isProd
        ? "script-src 'self' 'strict-dynamic' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: "{telegram,veopag,api.telegram,files.telegram}.com",
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
