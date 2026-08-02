"use server"

import { requireUser } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { authClient } from "@/lib/auth-client"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function updateUserProfile(input: { name?: string; image?: string }) {
  // Outside the try: `requireUser` redirects by throwing, and that must not be
  // turned into a generic "Erro ao atualizar perfil".
  const sessionUser = await requireUser()

  try {
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (input.name) {
      updateData.name = input.name.trim()
    }

    if (input.image !== undefined) {
      updateData.image = input.image
    }

    // Update user profile directly in DB
    await db.update(userTable).set(updateData).where(eq(userTable.id, sessionUser.id))

    // Log the activity
    await logActivity({
      storeId: sessionUser.storeId,
      action: `Perfil atualizado: ${input.name ? `nome alterado para "${input.name.trim()}"` : ""} ${input.image ? "foto alterada" : ""}`,
      category: "admin",
      actor: sessionUser,
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
