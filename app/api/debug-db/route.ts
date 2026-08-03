import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function GET() {
  try {
    const client = await pool.connect()
    try {
      // Verificar se a tabela user existe e suas colunas
      const res = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user'
        ORDER BY ordinal_position
      `)
      return NextResponse.json({
        columns: res.rows,
        timestamp: new Date().toISOString()
      })
    } finally {
      client.release()
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}
