import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as { __pgPool?: Pool }

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/placeholder",
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 20_000,
  })

// Guardamos o pool no globalThis SEMPRE (inclusive em produção). Antes isso
// só ocorria fora de produção, então em serverless (Vercel) cada invocação
// criava um pool novo e esgotava o limite de conexões do banco — a causa
// raiz do erro genérico "An error occurred in the Server Components render"
// ao publicar (o revalidatePath re-renderiza /posts com várias queries em
// paralelo e não sobra conexão).
globalForDb.__pgPool = pool

pool.on("error", (err) => {
  console.error("[db] Erro inesperado no pool do Postgres:", err)
})

export const db = drizzle(pool, { schema })
