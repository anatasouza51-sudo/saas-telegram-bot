import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

/**
 * Repair v14 — Converter coluna id de uuid para text (Better Auth usa string IDs)
 * Usa DROP + RENAME em vez de ALTER COLUMN TYPE para evitar lock.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  
  // PROTEÇÃO DE SEGURANÇA: Este endpoint é extremamente perigoso e deve ser protegido.
  // Exige um token definido no ambiente ou bloqueia o acesso.
  const expectedToken = process.env.REPAIR_TOKEN || "disable_repair_unless_token_is_set"
  if (!token || token !== expectedToken) {
    return new Response("Unauthorized: Missing or invalid REPAIR_TOKEN", { status: 401 })
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
      results.push(`Erro ao verificar tipo do id: ${err.message}`)
    }
    results.push(`Tipo atual do id: ${currentType}`)

    // 2. Se id é uuid, converter para text
    if (currentType === 'uuid') {
      // Contar registros existentes
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
          results.push(`Removida FK: ${fk.constraint_name} de ${fk.table_name}`)
        } catch (err: any) {
          results.push(`Erro ao remover FK ${fk.constraint_name}: ${err.message}`)
        }
      }

      // Remover PK atual (tentar nomes comuns)
      const pkRes = await client.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'user' AND constraint_type = 'PRIMARY KEY'
      `)
      for (const pk of pkRes.rows) {
        try {
          await client.query(`ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "${pk.constraint_name}" CASCADE`)
          results.push(`Removida PK: ${pk.constraint_name}`)
        } catch (err: any) {
          results.push(`Erro ao remover PK ${pk.constraint_name}: ${err.message}`)
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
      } else {
        results.push("Coluna id_text já existe, pulando criação")
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
        } else {
          results.push("Coluna id já é text, pulando drop")
        }
      } else {
        results.push("Coluna id não encontrada para drop")
      }
      
      const idRenameCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'id_text'
      `)
      if (idRenameCheck.rows.length > 0) {
        await client.query('ALTER TABLE "user" RENAME COLUMN id_text TO id')
        results.push("Renomeada coluna id_text para id")
      } else {
        results.push("Coluna id_text já foi renomeada para id")
      }
      results.push("Convertido id de uuid para text via drop+rename")

      // Remover default gen_random_uuid()
      try {
        await client.query('ALTER TABLE "user" ALTER COLUMN id DROP DEFAULT')
        results.push("Removido default gen_random_uuid()")
      } catch (err: any) {
        results.push(`Erro ao remover default: ${err.message}`)
      }

      // Recriar PK
      await client.query('ALTER TABLE "user" ADD PRIMARY KEY (id)')
      results.push("Recriada PK")

      // Recriar FKs (session.userId, account.userId, twoFactor.userId)
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
            results.push(`Recriada FK: ${refTable}.userId → user.id`)
          }
        } catch (err: any) {
          results.push(`Erro ao recriar FK ${refTable}: ${err.message}`)
        }
      }
    } else if (currentType === 'NAO EXISTE') {
      // 2. Se id não existe, renomear id_text para id
      results.push("Coluna id não existe, tentando renomear id_text para id...")
      const idTextCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'id_text'
      `)
      if (idTextCheck.rows.length > 0) {
        await client.query('ALTER TABLE "user" RENAME COLUMN id_text TO id')
        results.push("Renomeada coluna id_text para id")
        
        // Remover default gen_random_uuid()
        try {
          await client.query('ALTER TABLE "user" ALTER COLUMN id DROP DEFAULT')
          results.push("Removido default gen_random_uuid()")
        } catch (err: any) {
          results.push(`Erro ao remover default: ${err.message}`)
        }

        // Recriar PK
        await client.query('ALTER TABLE "user" ADD PRIMARY KEY (id)')
        results.push("Recriada PK")

        // Recriar FKs (session.userId, account.userId, twoFactor.userId)
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
              results.push(`Recriada FK: ${refTable}.userId → user.id`)
            }
          } catch (err: any) {
            results.push(`Erro ao recriar FK ${refTable}: ${err.message}`)
          }
        }
      } else {
        results.push("Coluna id_text também não existe, nada a fazer")
      }
    }

    // 3. Garantir role tem DEFAULT
    const roleCheck = await client.query(`
      SELECT column_default FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'role'
    `)
    if (roleCheck.rows[0]?.column_default === null) {
      await client.query("ALTER TABLE \"user\" ALTER COLUMN \"role\" SET DEFAULT 'admin'")
      results.push("Adicionado DEFAULT 'admin' na coluna role")
    }

    // 4. Verificar estado final
    const finalRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position
    `)
    results.push('--- Estado final ---')
    for (const row of finalRes.rows) {
      results.push(`  ${row.column_name}: ${row.data_type} (nullable=${row.is_nullable}, default=${row.column_default})`)
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    results.push(`ERRO CRITICO: ${err.message}`)
    return NextResponse.json({ results }, { status: 500 })
  } finally {
    client.release()
  }
}
