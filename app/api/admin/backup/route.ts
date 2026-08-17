import { NextResponse } from "next/server"
import { clientIpFrom, rateLimit, hashIp } from "@/lib/security"
import { logActivity } from "@/lib/log"

/**
 * Honeypot defensivo para detectar scanners automatizados e tentativas de acesso
 * a endpoints administrativos inexistentes.
 */
export async function GET(req: Request) {
  const ip = clientIpFrom(req)
  const method = req.method

  // 1. Registrar a tentativa no log de atividades (sem storeId específico, usamos "system" ou "admin")
  // Como o honeypot é global e não sabemos a qual loja o atacante está tentando acessar,
  // usamos um storeId genérico ou nulo se o sistema permitir. 
  // Olhando o lib/log.ts, o storeId é obrigatório. Usaremos "system" como placeholder.
  await logActivity({
    storeId: "system",
    action: "Tentativa de acesso ao honeypot administrativo",
    category: "security",
    details: `ip_hash=${hashIp(ip)} method=${method}`,
  })

  // 2. Aplicar bloqueio temporário via rate limiter distribuído
  // Usamos um limite bem baixo (1 tentativa) para acionar o bloqueio imediato por um tempo
  await rateLimit(`honeypot:${hashIp(ip)}`, {
    max: 1,
    windowMs: 3600_000, // 1 hora de bloqueio para este IP neste namespace
    namespace: "honeypot",
  })

  // 3. Retornar resposta genérica (404 Not Found) para não revelar o honeypot
  return new NextResponse(null, { status: 404 })
}

// Suportar também outros métodos comuns de scanners
export async function POST(req: Request) { return GET(req) }
export async function PUT(req: Request) { return GET(req) }
export async function DELETE(req: Request) { return GET(req) }
export async function PATCH(req: Request) { return GET(req) }
