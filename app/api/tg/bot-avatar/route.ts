import { NextResponse } from "next/server"
import { getSessionUser, hasCapability } from "@/lib/session"
import { safeFetch, validateFetchUrl } from "@/lib/ssrf-protection"

export const runtime = "nodejs"

/**
 * Proxy para carregar o avatar do bot do Telegram sem expor o token no frontend.
 * Corrigido (M-3): Utiliza validateFetchUrl e safeFetch para prevenir SSRF e túneis arbitrários.
 */
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user || !hasCapability(user, "telegram.manage")) {
    return new NextResponse("Não autorizado", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const telegramUrl = searchParams.get("url")

  if (!telegramUrl) {
    return new NextResponse("URL inválida", { status: 400 })
  }

  try {
    // Validação estrita de SSRF e domínio do Telegram
    const validated = validateFetchUrl(telegramUrl)
    if (!validated.startsWith("https://api.telegram.org/file/bot")) {
      return new NextResponse("URL não permitida", { status: 400 })
    }

    const response = await safeFetch(validated)
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
    return new NextResponse("Erro interno ou URL inválida", { status: 400 })
  }
}
