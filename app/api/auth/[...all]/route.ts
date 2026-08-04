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
    const response = await auth.handler(request)
    // Se for uma resposta de erro JSON, logar o corpo
    if (response instanceof Response && !response.ok && response.headers.get("content-type")?.includes("application/json")) {
      const clone = response.clone()
      const body = await clone.json()
      console.error("[auth POST] Better Auth Error Response:", JSON.stringify(body))
    }
    return response as any
  } catch (err: any) {
    console.error("[auth POST] Critical Exception:", err?.message, err?.stack)
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 })
  }
}
