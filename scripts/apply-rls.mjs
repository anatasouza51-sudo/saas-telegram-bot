import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import pg from "pg"

const { Pool } = pg
const migrationId = "0003_rls_tenant_isolation"
const migrationPath = resolve(process.cwd(), "lib/db/migrations/0003_rls_tenant_isolation.sql")

if (process.env.APPLY_RLS !== "1") {
  throw new Error("RLS não aplicado: defina APPLY_RLS=1 em um job de migration controlado.")
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("RLS não aplicado: DATABASE_URL é obrigatória e não possui fallback.")
}

const migrationSql = await readFile(migrationPath, "utf8")
const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
    ? undefined
    : { rejectUnauthorized: true },
})

const client = await pool.connect()
try {
  await client.query("BEGIN")
  await client.query("SET LOCAL lock_timeout = '10s'")
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.security_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const existing = await client.query(
    "SELECT 1 FROM public.security_migrations WHERE id = $1 LIMIT 1",
    [migrationId],
  )

  if (existing.rowCount === 0) {
    await client.query(migrationSql)
    await client.query(
      "INSERT INTO public.security_migrations (id) VALUES ($1)",
      [migrationId],
    )
    console.log(`[db/apply-rls] Migration ${migrationId} aplicada.`)
  } else {
    console.log(`[db/apply-rls] Migration ${migrationId} já registrada; nada a fazer.`)
  }

  await client.query("COMMIT")
} catch (error) {
  await client.query("ROLLBACK").catch(() => {})
  console.error(
    "[db/apply-rls] Falha; transação revertida.",
    error instanceof Error ? error.name : "unknown",
  )
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
