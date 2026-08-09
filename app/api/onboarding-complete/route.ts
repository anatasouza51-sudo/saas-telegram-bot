import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { csrfGuard } from "@/lib/security"

export async function POST(req: Request) {
  // CSRF protection: reject requests from untrusted origins
  const guard = csrfGuard(req)
  if (guard) return guard

  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    await db
      .update(userTable)
      .set({ onboardingSeen: true })
      .where(eq(userTable.id, sessionUser.id))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[onboarding-complete] Erro:", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
