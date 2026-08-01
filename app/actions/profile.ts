"use server"

import { requireUser } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { clerkClient } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(input: { name: string }) {
  // Outside the try: `requireUser` redirects by throwing, and that must not be
  // turned into a generic "Erro ao atualizar perfil".
  const currentUser = await requireUser()

  try {
    // Update user name in our DB
    await db
      .update(userTable)
      .set({
        name: input.name.trim(),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, currentUser.id))

    // Also update in Clerk
    try {
      await clerkClient.users.updateUser(currentUser.id, {
        firstName: input.name.trim().split(" ")[0],
        lastName: input.name.trim().split(" ").slice(1).join(" ") || undefined,
      })
    } catch (clerkErr) {
      console.error("[profile] Clerk update failed:", clerkErr)
      // Non-fatal: our DB is the source of truth
    }

    // Log the activity
    await logActivity({
      storeId: currentUser.storeId,
      action: `Perfil atualizado: nome alterado para "${input.name.trim()}"`,
      category: "admin",
      actor: currentUser,
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
