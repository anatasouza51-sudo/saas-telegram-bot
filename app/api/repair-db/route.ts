import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { safeEqual, rateLimit, clientIpFrom, hashIp } from "@/lib/security"

/**
 * Repair v15 — Converter coluna id de uuid para text (Better Auth usa string IDs)
 * Corrigido: Fail-closed se REPAIR_TOKEN não estiver definido, rate limit e comparação segura.
 */
export async function GET(req: Request) {
  // PROTEÇÃO DE SEGURANÇA: Fail-closed. Se REPAIR_TOKEN não estiver definido no ambiente,
  // o endpoint é totalmente desativado para impedir acesso com tokens hardcoded.
  const expectedToken = process.env.REPAIR_TOKEN
  if (!expectedToken || expectedToken.length < 16) {
    return new Response("Service Unavailable: REPAIR_TOKEN not configured", { status: 503 })
  }

  const authorization = req.headers.get("authorization") ?? ""
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null

  // Rate limit para evitar brute force do token
  const ip = clientIpFrom(req)
  const limit = await rateLimit(`repair:${hashIp(ip)}`, {
    max: 3,
    windowMs: 300_000, // 3 tentativas a cada 5 minutos
    namespace: "repair",
  })
  if (!limit.ok) {
    return new Response("Too Many Requests", { status: 429 })
  }

  if (!token || !safeEqual(token, expectedToken)) {
    return new Response("Unauthorized", { status: 401 })
  }

  const results: string[] = []
  const client = await pool.connect()
  try {
    // 1. Verificar tipo atual do id
    let currentType = 'NAO EXISTE'
    try {
      const idCheck = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'id'
      `)
      currentType = idCheck.rows[0]?.data_type || 'NAO EXISTE'
    } catch (err: any) {
      results.push(`Erro ao verificar tipo do id`)
    }
    results.push(`Tipo atual do id verificado com sucesso`)

    // 2. Se id é uuid, converter para text
    if (currentType === 'uuid') {
      const countRes = await client.query('SELECT COUNT(*) FROM "user"')
      const userCount = parseInt(countRes.rows[0].count)
      results.push(`Registros existentes: ${userCount}`)

      // Remover FK constraints que dependem de user.id
      const fkRes = await client.query(`
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.constraint_schema = ccu.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'user'
          AND (ccu.column_name = 'id' OR ccu.column_name = 'id_text')
      `)
      for (const fk of fkRes.rows) {
        try {
          await client.query(`ALTER TABLE "${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`)
          results.push(`Removida FK de tabela relacionada`)
        } catch (err: any) {
          results.push(`Erro ao remover FK`)
        }
      }

      // Remover PK atual
      const pkRes = await client.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'user' AND constraint_type = 'PRIMARY KEY'
      `)
      for (const pk of pkRes.rows) {
        try {
          await client.query(`ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "${pk.constraint_name}" CASCADE`)
          results.push(`Removida PK`)
        } catch (err: any) {
          results.push(`Erro ao remover PK`)
        }
      }

      // Converter id de uuid para text usando drop + rename
      const idTextCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'id_text'
      `)
      if (idTextCheck.rows.length === 0) {
        await client.query('ALTER TABLE "user" ADD COLUMN id_text TEXT')
        results.push("Criada coluna id_text")
      }
      
      const idColumnCheck = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'id'
      `)
      if (idColumnCheck.rows.length > 0) {
        if (idColumnCheck.rows[0].data_type === 'uuid') {
          await client.query('UPDATE "user" SET id_text = id::text')
          await client.query('ALTER TABLE "user" DROP COLUMN id CASCADE')
          results.push("Dropada coluna id (uuid) antiga")
        }
      }
      
      const idRenameCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'id_text'
      `)
      if (idRenameCheck.rows.length > 0) {
        await client.query('ALTER TABLE "user" RENAME COLUMN id_text TO id')
        results.push("Renomeada coluna id_text para id")
      }

      try {
        await client.query('ALTER TABLE "user" ALTER COLUMN id DROP DEFAULT')
        results.push("Removido default gen_random_uuid()")
      } catch (err: any) {}

      await client.query('ALTER TABLE "user" ADD PRIMARY KEY (id)')
      results.push("Recriada PK")

      for (const refTable of ['session', 'account', 'twoFactor']) {
        try {
          const exists = await client.query(`
            SELECT 1 FROM information_schema.tables
            WHERE table_name = '${refTable}'
          `)
          if (exists.rows.length > 0) {
            await client.query(`
              ALTER TABLE "${refTable}"
              ADD CONSTRAINT "${refTable}_userid_fkey"
              FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
            `)
            results.push(`Recriada FK para ${refTable}`)
          }
        } catch (err: any) {}
      }
    } else if (currentType === 'NAO EXISTE') {
      const idTextCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'id_text'
      `)
      if (idTextCheck.rows.length > 0) {
        await client.query('ALTER TABLE "user" RENAME COLUMN id_text TO id')
        try {
          await client.query('ALTER TABLE "user" ALTER COLUMN id DROP DEFAULT')
        } catch (err: any) {}
        await client.query('ALTER TABLE "user" ADD PRIMARY KEY (id)')
        for (const refTable of ['session', 'account', 'twoFactor']) {
          try {
            await client.query(`
              ALTER TABLE "${refTable}"
              ADD CONSTRAINT "${refTable}_userid_fkey"
              FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
            `)
          } catch (err: any) {}
        }
      }
    }

    const roleCheck = await client.query(`
      SELECT column_default FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'role'
    `)
    if (roleCheck.rows[0]?.column_default === null) {
      await client.query("ALTER TABLE \"user\" ALTER COLUMN \"role\" SET DEFAULT 'support'")
      results.push("Adicionado DEFAULT 'support' na coluna role")
    }

    return NextResponse.json({ success: true, message: "Banco reparado com sucesso" })
  } catch {
    console.error("[repair-db] Erro crítico")
    return NextResponse.json({ success: false, error: "Erro interno ao reparar banco" }, { status: 500 })
  } finally {
    client.release()
  }
}
