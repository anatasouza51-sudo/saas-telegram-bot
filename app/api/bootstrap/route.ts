import { NextResponse } from "next/server"
import { ensureDbStructure } from "@/lib/db/migrate"

export const dynamic = "force-dynamic"

/**
 * Endpoint público para garantir que o banco de dados está inicializado.
 * Pode ser acessado uma vez após o deploy para criar todas as tabelas.
 * 
 * Uso: GET /api/bootstrap
 * 
 * Isso garante que as tabelas do Better Auth (user, session, account, verification)
 * e todas as tabelas do app existem antes de qualquer operação.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  
  // PROTEÇÃO DE SEGURANÇA: Evitar que o bootstrap seja disparado por terceiros.
  // Se nenhum token estiver configurado, bloqueamos por padrão (seguro por design).
  const expectedToken = process.env.BOOTSTRAP_TOKEN || process.env.REPAIR_TOKEN
  if (!expectedToken || token !== expectedToken) {
    console.warn(`[bootstrap] Tentativa de acesso não autorizado bloqueada. IP: ${req.headers.get("x-real-ip") || "unknown"}`)
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    await ensureDbStructure()
    return NextResponse.json({ 
      success: true, 
      message: "Banco de dados inicializado com sucesso. Todas as tabelas estão criadas." 
    }, { status: 200 })
  } catch (err: any) {
    console.error("[bootstrap] Erro ao inicializar banco:", err)
    return NextResponse.json({ 
      success: false, 
      message: "Falha ao inicializar banco de dados"
      // Removido err.message para evitar Information Disclosure (CWE-209)
    }, { status: 500 })
  }
}
