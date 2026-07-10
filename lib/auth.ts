import { betterAuth } from "better-auth"
import { Pool } from "pg"

const hookPool = new Pool({ connectionString: process.env.DATABASE_URL })

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
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL: getBaseURL(),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "support",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // The very first registered account becomes the principal admin.
          const { rows } = await hookPool.query('SELECT COUNT(*)::int AS count FROM "user"')
          const isFirst = (rows[0]?.count ?? 0) === 0
          return {
            data: {
              ...userData,
              role: isFirst ? "admin" : "support",
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
