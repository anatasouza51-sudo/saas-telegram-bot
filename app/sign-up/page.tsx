import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { sql } from "drizzle-orm"
import { AuthForm } from "@/components/auth-form"

export default async function SignUpPage() {
  const current = await getSessionUser()
  if (current) redirect("/")

  // Only allow open sign-up when there are no admins yet (first-time setup).
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)

  if (count > 0) redirect("/sign-in")

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <AuthForm mode="sign-up" />
    </main>
  )
}
