import { betterAuth } from "better-auth"
import { twoFactor } from "better-auth/plugins"
import { pool } from "@/lib/db"
import { renderVerificationEmail } from "@/lib/email"

// SECURITY: Email verification via Resend (gratuito até 100 emails/dia).
// Configure RESEND_API_KEY e EMAIL_FROM no painel do Vercel para ativar.
// Sem a API key, a verificação é pulada (degraded) mas o schema emailVerified
// continua no banco para quando a chave for configurada.
const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@saas-telegram-bot.com"

async function sendVerificationEmail({ user, url }: { user: { email: string; name?: string }; url: string }) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [user.email],
      subject: "Confirme seu email — SaaS Telegram Bot",
      html: renderVerificationEmail({ name: user.name, url }),
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Resend send failed: ${resp.status} ${text}`)
  }
}

function getBaseURL() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "https://ghostsbot.vercel.app"
}

const trustedOrigins = [
  process.env.V0_RUNTIME_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined,
  "https://*.vercel.app",
  "https://*.vusercontent.net",
  "https://*.v0.dev",
  "https://*.v0.app",
].filter(Boolean) as string[]

// PROTEÇÃO DE SEGURANÇA (C-2): Better Auth exige um segredo configurado.
// O segredo deve ser fornecido pelo secret management do ambiente de execução.
const authSecret = process.env.BETTER_AUTH_SECRET
if (!authSecret) {
  throw new Error("[auth] BETTER_AUTH_SECRET must be configured")
}

export const auth = betterAuth({
  database: pool,
  secret: authSecret,
  baseURL: getBaseURL(),
  trustedOrigins,
  appName: "SaaS Telegram Bot",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Desativado para permitir acesso direto sem exigir Resend API Key
    requireEmailVerification: false,
  },
  // sendOnSignUp é true por padrão quando requireEmailVerification está ativo.
  emailVerification: RESEND_API_KEY ? { sendVerificationEmail } : undefined,
  plugins: process.env.DISABLE_TWOFACTOR === "1" ? [] : [
    twoFactor({
      issuer: "SaaS Telegram Bot",
      allowPasswordless: false,
      skipVerificationOnEnable: false,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 60, max: 3 },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "admin",
        input: false,
      },
      ownerId: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      onboardingSeen: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          return {
            data: {
              ...userData,
              role: "admin",
              ownerId: null,
            },
          }
        },
      },
    },
  },
  advanced: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    // BUGFIX: Forçar SameSite: None e Secure: true para garantir que o cookie de sessão 
    // seja aceito em redirecionamentos entre subdomínios Vercel (ex: ghostsbot.vercel.app -> ghostsbot-git-main.vercel.app)
    defaultCookieAttributes: {
      sameSite: "none" as const,
      secure: true,
      httpOnly: true,
    },
  },
})
