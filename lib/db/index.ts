import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

// Em serverless (Vercel), cada invocação de função pode instanciar este
// módulo de novo. Sem limitar `max` e sem reaproveitar a instância entre
// invocações "quentes", cada request abre seu próprio pool de até 10
// conexões (padrão do `pg`) — isso esgota rapidamente o limite de conexões
// do Postgres (comum em Neon/Supabase) e derruba a página, especialmente em
// /posts, que faz várias queries em paralelo. Guardamos o pool em
// `globalThis` para reaproveitá-lo entre invocações da mesma instância de
// função, e limitamos `max` para não estourar o limite do banco quando
// várias instâncias de função rodam ao mesmo tempo.
const globalForDb = globalThis as unknown as { __pgPool?: Pool }

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Baixo de propósito: multiplicado pelo número de instâncias de função
    // simultâneas, isso já soma bastante. Ajuste conforme o limite do plano
    // do seu banco.
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 20_000,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgPool = pool
}

// Sem este listener, um erro em uma conexão ociosa (ex.: o banco derrubando
// a conexão) emite um evento "error" não tratado no processo e derruba a
// função inteira — é essa a causa mais provável do erro genérico de
// servidor ("This page couldn't load") visto no navegador.
pool.on("error", (err) => {
  console.error("[db] Erro inesperado no pool do Postgres:", err)
})

export const db = drizzle(pool, { schema })
