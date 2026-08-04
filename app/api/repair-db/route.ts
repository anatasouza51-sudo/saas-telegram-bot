import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

/**
 * Repair v3 — Converter coluna id de uuid para text (Better Auth usa string IDs)
 * e garantir que role tem DEFAULT.
 */
export async function GET() {
  const results: string[] = []
  const client = await pool.connect()
  try {
    // 1. Verificar tipo atual do id
    const idCheck = await client.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'id'
    `)
    results.push(`Tipo atual do id: ${idCheck.rows[0]?.data_type || 'NAO EXISTE'}`)

    // 2. Se id é uuid, converter para text
    if (idCheck.rows[0]?.data_type === 'uuid') {
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
          AND ccu.column_name = 'id'
      `)
      for (const fk of fkRes.rows) {
        try {
          await client.query(`ALTER TABLE "${fk.table_name}" DROP CONSTRAINT "${fk.constraint_name}"`)
          results.push(`Removida FK: ${fk.constraint_name} de ${fk.table_name}`)
        } catch (err: any) {
          results.push(`Erro ao remover FK ${fk.constraint_name}: ${err.message}`)
        }
      }

      // Remover PK atual
      await client.query('ALTER TABLE "user" DROP CONSTRAINT user_pkey')
      results.push("Removida PK user_pkey")

      // Converter id de uuid para text
      await client.query('ALTER TABLE "user" ALTER COLUMN id TYPE text USING id::text')
      results.push("Convertido id de uuid para text")

      // Remover default gen_random_uuid()
      await client.query('ALTER TABLE "user" ALTER COLUMN id DROP DEFAULT')
      results.push("Removido default gen_random_uuid()")

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
