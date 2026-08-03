import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

/**
 * Endpoint de repair para limpar colunas duplicadas na tabela user.
 * A tabela user tem colunas duplicadas (id, name, email, etc.)
 * criadas por migracoes anteriores que usaram ALTER TABLE ADD COLUMN
 * sem verificar duplicatas. Isso causa "Failed to create user".
 *
 * Uso: GET /api/repair-db
 */
export async function GET() {
  const results: string[] = []
  const client = await pool.connect()
  try {
    // 1. Listar todas as colunas da tabela user com ordinals
    const colRes = await client.query(`
      SELECT column_name, ordinal_position, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position
    `)
    results.push(`Colunas encontradas: ${colRes.rows.length}`)

    // 2. Identificar colunas duplicadas (por nome, mantendo a de menor ordinal)
    const seen = new Map<string, number>()
    const toRemove: { name: string; ordinal: number }[] = []
    for (const row of colRes.rows) {
      const existing = seen.get(row.column_name)
      if (existing !== undefined) {
        // Ja vimos essa coluna — remover a duplicata (maior ordinal)
        toRemove.push({ name: row.column_name, ordinal: row.ordinal_position })
        // Se a anterior era a duplicata (maior ordinal), remover ela e manter esta
        if (existing > row.ordinal_position) {
          // Trocar: remover a anterior, manter esta
          const idx = toRemove.findIndex(r => r.ordinal === existing)
          if (idx >= 0) toRemove.splice(idx, 1)
          toRemove.push({ name: row.column_name, ordinal: existing })
        }
      } else {
        seen.set(row.column_name, row.ordinal_position)
      }
    }

    results.push(`Colunas duplicadas a remover: ${toRemove.length}`)

    // 3. Remover colunas duplicadas
    for (const col of toRemove) {
      try {
        // Precisamos remover por posicao ordinal, nao por nome
        // Usar DROP COLUMN com a coluna que tem o ordinal mais alto
        const checkRes = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'user' AND ordinal_position = $1
        `, [col.ordinal])
        if (checkRes.rows.length > 0) {
          const actualName = checkRes.rows[0].column_name
          await client.query(`ALTER TABLE "user" DROP COLUMN "${actualName}"`)
          results.push(`Removida coluna duplicada: ${actualName} (ordinal ${col.ordinal})`)
        }
      } catch (err: any) {
        results.push(`Erro ao remover ${col.name}: ${err.message}`)
      }
    }

    // 4. Adicionar colunas faltantes (twoFactorEnabled, onboardingSeen)
    const afterRes = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'user'
    `)
    const existingCols = new Set(afterRes.rows.map(r => r.column_name))

    if (!existingCols.has('twoFactorEnabled')) {
      try {
        await client.query('ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" BOOLEAN DEFAULT FALSE')
        results.push('Adicionada coluna: twoFactorEnabled')
      } catch (err: any) {
        results.push(`Erro ao adicionar twoFactorEnabled: ${err.message}`)
      }
    }

    if (!existingCols.has('onboardingSeen')) {
      try {
        await client.query('ALTER TABLE "user" ADD COLUMN "onboardingSeen" BOOLEAN DEFAULT FALSE')
        results.push('Adicionada coluna: onboardingSeen')
      } catch (err: any) {
        results.push(`Erro ao adicionar onboardingSeen: ${err.message}`)
      }
    }

    // 5. Verificar estado final
    const finalRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position
    `)
    results.push('--- Estado final ---')
    for (const row of finalRes.rows) {
      results.push(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`)
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    results.push(`ERRO CRITICO: ${err.message}`)
    return NextResponse.json({ results }, { status: 500 })
  } finally {
    client.release()
  }
}
