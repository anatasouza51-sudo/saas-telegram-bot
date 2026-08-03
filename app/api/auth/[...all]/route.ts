import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { ensureDbStructure } from "@/lib/db/migrate"
import { NextRequest, NextResponse } from "next/server"

let dbReady = false

async function ensureDb() {
  if (dbReady) return
  try {
    await ensureDbStructure()
    dbReady = true
  } catch (err) {
    console.error("[auth route] Falha ao garantir estrutura do banco:", err)
    dbReady = false
  }
}

export async function GET(request: NextRequest) {
  await ensureDb()
  try {
    return auth.handler(request) as any
  } catch (err: any) {
    console.error("[auth GET] Erro:", err?.message)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  await ensureDb()
  try {
    return auth.handler(request) as any
  } catch (err: any) {
    console.error("[auth POST] Erro:", err?.message, err?.stack)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
