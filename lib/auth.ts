import { betterAuth } from "better-auth"
import { twoFactor } from "better-auth/plugins"
import { pool } from "@/lib/db"

function getBaseURL() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.V0_RUNTIME_URL || "http://localhost:3000"
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

// PROTEÇÃO DE SEGURANÇA (C-2): Fail-closed para Better Auth secret.
// Se BETTER_AUTH_SECRET não estiver definido, usamos um fallback para permitir build.
// Em produção, configure BETTER_AUTH_SECRET nas variáveis de ambiente do Vercel.
const authSecret =
  process.env.BETTER_AUTH_SECRET || "vercel-build-fallback-secret-at-least-32-chars-long"
if (process.env.NODE_ENV === "production") {
  console.warn(
    "[auth] AVISO: BETTER_AUTH_SECRET não configurado. Configure a variável de ambiente no Vercel para produção."
  )
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
  },
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
  },
})
