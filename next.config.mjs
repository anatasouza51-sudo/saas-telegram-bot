// Security headers applied to every response. CSP is intentionally strict but
// allows the styles/images this app actually uses. 'unsafe-inline' is required
// for Next's inline runtime styles; scripts avoid it in production.

// SCRIPT-CSP em produção:
// 'strict-dynamic' foi removido porque ele DESABILITA o allowlisting por host
// (incluindo 'self') e exige nonce/hash em cada <script>. O Next.js NÃO injeta
// nonces quando a CSP é definida via headers() custom, então os chunks estáticos
// em /_next/static/chunks/*.js eram BLOQUEADOS pelo navegador — a hidratação
// React nunca acontecia e o formulário de login ficava inerte (loop de
// autenticação). 'unsafe-inline' permanece: é a abordagem documentada pela
// equipe do Next.js para CSP aplicada via headers custom, e o restante da CSP
// (default-src 'self', form-action 'self', frame-ancestors 'none' etc.)
// continua mitigando XSS e clickjacking.
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
      "script-src 'self' 'unsafe-inline'",
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
