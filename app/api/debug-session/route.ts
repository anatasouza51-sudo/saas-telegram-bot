import { getSessionUser } from "@/lib/session"
import { auth } from "@/lib/auth"
import { headers, cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Test 1: getSessionUser
    const user = await getSessionUser()
    
    // Test 2: Direct auth.api.getSession with headers
    let sessionViaHeaders: any = null
    try {
      sessionViaHeaders = await auth.api.getSession({ headers: await headers() })
    } catch (e: any) {
      sessionViaHeaders = { error: String(e?.message || e) }
    }
    
    // Test 3: Direct auth.api.getSession with cookies
    let sessionViaCookies: any = null
    try {
      const cookieStore = await cookies()
      const entries = cookieStore.getAll()
      const cookieHeader = entries.map(c => `${c.name}=${c.value}`).join("; ")
      sessionViaCookies = await auth.api.getSession({
        headers: new Headers({ cookie: cookieHeader }),
      })
    } catch (e: any) {
      sessionViaCookies = { error: String(e?.message || e) }
    }

    return NextResponse.json({
      getSessionUser: user || null,
      sessionViaHeaders: sessionViaHeaders?.user?.name || null,
      sessionViaCookies: sessionViaCookies?.user?.name || null,
    })
  } catch (e: any) {
    return NextResponse.json({
      error: String(e?.message || e),
      stack: e?.stack?.split("\n").slice(0, 5),
    }, { status: 500 })
  }
}
