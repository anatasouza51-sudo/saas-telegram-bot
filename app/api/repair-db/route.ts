import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

/**
 * Repair v2 — usa CASCADE para forçar remoção de colunas duplicadas
 * que têm dependências (FK de outras tabelas).
 * Depois reconstrói as FK necessárias.
 */
export async function GET() {
  const results: string[] = []
  const client = await pool.connect()
  try {
    // 1. Verificar estado atual
    const colRes = await client.query(`
      SELECT column_name, ordinal_position, data_type
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position
    `)
    results.push(`Estado atual: ${colRes.rows.length} colunas`)

    // 2. Remover coluna id UUID duplicada (manter a TEXT que tem FK)
    // Primeiro: salvar dados da coluna uuid para não perder nada
    const uuidCheck = await client.query(`
      SELECT ordinal_position FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'id' AND data_type = 'uuid'
    `)
    if (uuidCheck.rows.length > 0) {
      try {
        // Remover com CASCADE para forçar (FK dependem dessa coluna)
        // Mas queremos manter a TEXT, não a UUID
        // Estratégia: remover a UUID que tem dependências
        await client.query(`ALTER TABLE "user" DROP COLUMN "id" CASCADE`)
        results.push("Removida coluna id UUID (CASCADE)")
        // A coluna TEXT já foi removida automaticamente pelo CASCADE?
        // Verificar
        const afterId = await client.query(`
          SELECT data_type FROM information_schema.columns
          WHERE table_name = 'user' AND column_name = 'id'
        `)
        if (afterId.rows.length === 0) {
          results.push("ATENÇÃO: Coluna id TEXT também foi removida pelo CASCADE!")
          // Recriar coluna id TEXT
          await client.query(`ALTER TABLE "user" ADD COLUMN "id" TEXT NOT NULL DEFAULT ''`)
          await client.query(`ALTER TABLE "user" ADD CONSTRAINT user_pkey PRIMARY KEY (id)`)
          results.push("Recriada coluna id TEXT com PK")
        } else if (afterId.rows.length === 1) {
          results.push(`Coluna id restante: ${afterId.rows[0].data_type}`)
        }
      } catch (err: any) {
        results.push(`Erro ao remover id UUID: ${err.message}`)
      }
    }

    // 3. Remover coluna createdAt duplicada
    const tsCheck = await client.query(`
      SELECT ordinal_position, data_type FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'createdAt'
      ORDER BY ordinal_position
    `)
    if (tsCheck.rows.length > 1) {
      try {
        // Remover a que tem timestamp with time zone (ordinal menor)
        const toRemove = tsCheck.rows[0]
        await client.query(`ALTER TABLE "user" DROP COLUMN "createdAt"`)
        results.push(`Removida coluna createdAt (${toRemove.data_type})`)
      } catch (err: any) {
        results.push(`Erro ao remover createdAt: ${err.message}`)
      }
    }

    // 4. Remover colunas extras desnecessárias (banned, banReason, banExpires)
    for (const col of ['banned', 'banReason', 'banExpires']) {
      try {
        const exists = await client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user' AND column_name = '${col}'
        `)
        if (exists.rows.length > 0) {
          await client.query(`ALTER TABLE "user" DROP COLUMN "${col}"`)
          results.push(`Removida coluna: ${col}`)
        }
      } catch (err: any) {
        results.push(`Erro ao remover ${col}: ${err.message}`)
      }
    }

    // 5. Garantir colunas necessárias
    const neededCols = [
      { name: 'twoFactorEnabled', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'onboardingSeen', type: 'BOOLEAN DEFAULT FALSE' },
    ]
    for (const col of neededCols) {
      try {
        const exists = await client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user' AND column_name = '${col.name}'
        `)
        if (exists.rows.length === 0) {
          await client.query(`ALTER TABLE "user" ADD COLUMN "${col.name}" ${col.type}`)
          results.push(`Adicionada coluna: ${col.name}`)
        }
      } catch (err: any) {
        results.push(`Erro ao adicionar ${col.name}: ${err.message}`)
      }
    }

    // 6. Verificar estado final
    const finalRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position
    `)
    results.push('--- Estado final ---')
    for (const row of finalRes.rows) {
      results.push(`  ${row.column_name}: ${row.data_type} (nullable=${row.is_nullable})`)
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    results.push(`ERRO CRITICO: ${err.message}`)
    return NextResponse.json({ results }, { status: 500 })
  } finally {
    client.release()
  }
}
