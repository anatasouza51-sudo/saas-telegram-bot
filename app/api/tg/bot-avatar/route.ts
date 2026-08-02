import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { can } from "@/lib/roles"

export const runtime = "nodejs"

/**
 * Proxy para carregar o avatar do bot do Telegram sem expor o token no frontend.
 * Recebe a URL completa do Telegram (que contém o token) e retransmite os bytes.
 */
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user || !can(user.role, "telegram.manage")) {
    return new NextResponse("Não autorizado", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const telegramUrl = searchParams.get("url")

  if (!telegramUrl || !telegramUrl.startsWith("https://api.telegram.org/file/bot")) {
    return new NextResponse("URL inválida", { status: 400 })
  }

  try {
    const response = await fetch(telegramUrl)
    if (!response.ok || !response.body) {
      return new NextResponse("Falha ao buscar imagem do Telegram", { status: response.status })
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[bot-avatar-proxy] Error:", err)
    return new NextResponse("Erro interno", { status: 500 })
  }
}
