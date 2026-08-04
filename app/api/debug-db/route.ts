import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { ensureDbStructure } from "@/lib/db/migrate"

export async function GET() {
  const logs: string[] = []
  const originalLog = console.log
  const originalError = console.error
  
  // Capturar logs durante a migração
  console.log = (...args) => {
    logs.push(`[LOG] ${args.join(" ")}`)
    originalLog(...args)
  }
  console.error = (...args) => {
    logs.push(`[ERROR] ${args.join(" ")}`)
    originalError(...args)
  }

  try {
    await ensureDbStructure()
    
    const client = await pool.connect()
    try {
      const res = await client.query(`
        SELECT table_schema, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user'
        ORDER BY table_schema, ordinal_position
      `)
      return NextResponse.json({
        columns: res.rows,
        migrationLogs: logs,
        timestamp: new Date().toISOString()
      })
    } finally {
      client.release()
    }
  } catch (err: any) {
    return NextResponse.json({ 
      error: err?.message || "Unknown error",
      migrationLogs: logs
    }, { status: 500 })
  } finally {
    console.log = originalLog
    console.error = originalError
  }
}
