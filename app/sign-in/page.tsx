import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export default async function SignInPage() {
  const user = await getSessionUser()
  if (user) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <AuthForm mode="sign-in" />
    </main>
  )
}
