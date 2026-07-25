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
    connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/placeholder",
    max: 3, // Leve aumento para acomodar queries em paralelo sem esgotar
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000, // Leve aumento para dar chance ao Neon de acordar
    ssl: {
      rejectUnauthorized: false, // Necessário para Neon/Supabase em alguns ambientes Vercel
    },
  })

// Guardamos o pool no globalThis SEMPRE (inclusive em produção). Antes isso
// só ocorria fora de produção, então em serverless (Vercel) cada invocação
// criava um pool novo e esgotava o limite de conexões do banco — a causa
// raiz do erro genérico "An error occurred in the Server Components render"
// ao publicar (o revalidatePath re-renderiza /posts com várias queries em
// paralelo e não sobra conexão).
globalForDb.__pgPool = pool

// Sem este listener, um erro em uma conexão ociosa (ex.: o banco derrubando
// a conexão) emite um evento "error" não tratado no processo e derruba a
// função inteira — é essa a causa mais provável do erro genérico de
// servidor ("This page couldn't load") visto no navegador.
pool.on("error", (err) => {
  console.error("[db] Erro inesperado no pool do Postgres:", err)
})

// Adiciona um listener global para rejeições de promessas não tratadas
// que podem vir do Drizzle/PG e derrubar o Server Component.
if (typeof process !== "undefined") {
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[db] Rejeição não tratada em:", promise, "motivo:", reason)
  })
}

export const db = drizzle(pool, { schema })
