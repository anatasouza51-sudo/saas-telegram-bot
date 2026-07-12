import { betterAuth } from "better-auth"
import { Pool } from "pg"

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
  // Wildcards cover v0 preview and Vercel preview/production domains, which
  // change per deployment and would otherwise trigger "Invalid origin".
  "https://*.vercel.app",
  "https://*.vusercontent.net",
  "https://*.v0.dev",
  "https://*.v0.app",
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL: getBaseURL(),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    // Enforce a reasonable minimum; Better Auth hashes with scrypt by default.
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  // Sessions expire after 7 days and refresh at most once per day. Better Auth
  // stores sessions in the DB, so revocation/logout is immediate and complete.
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  // Built-in rate limiting throttles brute-force attempts. Auth endpoints get a
  // tighter window than the global default.
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
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // Every direct signup is the owner (admin) of their own store.
          // Team members are created server-side with an explicit ownerId/role,
          // so we only default self-service signups here.
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
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
