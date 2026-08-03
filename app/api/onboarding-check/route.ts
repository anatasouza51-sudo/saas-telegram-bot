import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"

export async function GET() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ onboardingSeen: true }, { status: 200 })
    }
    return NextResponse.json({ onboardingSeen: sessionUser.onboardingSeen })
  } catch (err) {
    console.error("[onboarding-check] Erro:", err)
    return NextResponse.json({ onboardingSeen: true }, { status: 200 })
  }
}
