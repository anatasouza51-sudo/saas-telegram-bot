"use server"

import { requireUser } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { authClient } from "@/lib/auth-client"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(input: { name: string }) {
  try {
    const user = await requireUser()

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
    console.error("Erro ao atualizar perfil:", error)
    return { ok: false, error: "Erro ao atualizar perfil" }
  }
}
