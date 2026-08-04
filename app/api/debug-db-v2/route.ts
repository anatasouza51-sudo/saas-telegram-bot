import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { ensureDbStructure } from "@/lib/db/migrate"

export const dynamic = 'force-dynamic'

export async function GET() {
  return handleRequest()
}

export async function POST() {
  return handleRequest()
}

async function handleRequest() {
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
        SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_name IN ('user', 'session', 'account', 'users')
        ORDER BY table_schema, table_name, ordinal_position
      `)
      const tables = await client.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      `)
      const publicData = await client.query('SELECT id, email, name FROM public."user" LIMIT 10').catch(() => ({ rows: [] }))
      const publicCount = await client.query('SELECT count(*) FROM public."user"').catch(() => ({ rows: [{count: 0}] }))
      const neonData = await client.query('SELECT id, email, name FROM neon_auth."user" LIMIT 10').catch(() => ({ rows: [] }))
      const neonCount = await client.query('SELECT count(*) FROM neon_auth."user"').catch(() => ({ rows: [{count: 0}] }))
      
      return NextResponse.json({
        columns: res.rows,
        tables: tables.rows,
        publicData: publicData.rows,
        publicCount: publicCount.rows[0],
        neonData: neonData.rows,
        neonCount: neonCount.rows[0],
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
