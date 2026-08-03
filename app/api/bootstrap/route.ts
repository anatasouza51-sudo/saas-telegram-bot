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
export async function GET() {
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
      message: "Falha ao inicializar banco de dados",
      error: err.message 
    }, { status: 500 })
  }
}
