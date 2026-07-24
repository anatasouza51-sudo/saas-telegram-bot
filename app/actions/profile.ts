"use server"

import { requireUser } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { authClient } from "@/lib/auth-client"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(input: { name: string }) {
  // Outside the try: `requireUser` redirects by throwing, and that must not be
  // turned into a generic "Erro ao atualizar perfil".
  const user = await requireUser()

  try {
    // Update user profile using better-auth
    const response = await fetch(`${process.env.BETTER_AUTH_URL || ""}/api/auth/update-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name.trim(),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error(
        `[profile] update failed (HTTP ${response.status}):`,
        detail.slice(0, 500),
      )
      return { ok: false, error: "Falha ao atualizar perfil" }
    }

    // Log the activity
    await logActivity({
      storeId: user.storeId,
      action: `Perfil atualizado: nome alterado para "${input.name.trim()}"`,
      category: "admin",
      actor: user,
    })

    revalidatePath("/")
    return { ok: true }
  } catch (error) {
    console.error("[profile] update failed:", error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar perfil",
    }
  }
}
