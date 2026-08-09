"use server"

import { db } from "@/lib/db"
import { user, activityLogs } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { validateProfileName, validateEmail } from "@/lib/validation"
import { ROLES, type Role } from "@/lib/roles"
import { and, eq, or } from "drizzle-orm"

import { revalidatePath } from "next/cache"

function storeMembers(storeId: string) {
  return or(eq(user.id, storeId), eq(user.ownerId, storeId))
}

export async function getAdmins() {
  const actor = await requireCapability("admins.manage")
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(storeMembers(actor.storeId))
    .orderBy(user.createdAt)
}

export async function createAdmin(input: {
  name: string
  email: string
  password: string
  role: Role
}) {
  const actor = await requireCapability("admins.manage")

  if (!ROLES.includes(input.role)) {
    return { ok: false, error: "Permissão inválida" }
  }

  const name = validateProfileName(input.name)
  const email = validateEmail(input.email)

  let newUserId: string | undefined
  try {
    // 1. Better Auth cria o usuário (com hash de senha)
    const created = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password: input.password,
      },
    })

    newUserId = created.user?.id
    if (!newUserId) {
      throw new Error("Falha ao recuperar ID do novo usuário")
    }

    // 2. Corrigido (A-2): Executamos o vínculo à loja dentro de transação e
    // garantimos consistência atômica. Se falhar, fazemos compensação removendo o usuário criado.
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ 
          role: input.role, 
          ownerId: actor.storeId,
          onboardingSeen: true 
        })
        .where(eq(user.id, newUserId!))

      await tx.insert(activityLogs).values({
        ownerId: actor.storeId,
        action: `Administrador criado: ${email} (${input.role})`,
        category: "admin",
        actorId: actor.id,
        actorName: actor.name,
      })
    })

    revalidatePath("/admins")
    return { ok: true }
  } catch (e) {
    console.error("[admins] could not create admin, rolling back user:", e)
    // Compensação: se o vínculo falhou, removemos o usuário órfão criado pelo signup
    if (newUserId) {
      try {
        await db.delete(user).where(eq(user.id, newUserId))
      } catch (cleanupErr) {
        console.error("[admins] failed to cleanup orphaned user after transaction failure:", cleanupErr)
      }
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao criar administrador",
    }
  }
}

export async function updateAdminRole(userId: string, role: Role) {
  const actor = await requireCapability("admins.manage")
  if (!ROLES.includes(role)) return { ok: false, error: "Permissão inválida" }

  const [target] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, userId), storeMembers(actor.storeId)))
    .limit(1)
  if (!target) return { ok: false, error: "Administrador não encontrado." }

  if (role !== "admin") {
    const admins = await db
      .select()
      .from(user)
      .where(and(eq(user.role, "admin"), storeMembers(actor.storeId)))
    if (admins.length === 1 && target.role === "admin") {
      return {
        ok: false,
        error: "Não é possível rebaixar o único administrador principal.",
      }
    }
  }

  await db.update(user).set({ role }).where(eq(user.id, userId))
  await logActivity({
    storeId: actor.storeId,
    action: `Permissão alterada para ${role}`,
    category: "admin",
    actor,
  })
  revalidatePath("/admins")
  return { ok: true }
}

export async function deleteAdmin(userId: string) {
  const actor = await requireCapability("admins.manage")
  if (actor.id === userId) {
    return { ok: false, error: "Você não pode remover a si mesmo." }
  }

  const [target] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, userId), storeMembers(actor.storeId)))
    .limit(1)
  if (!target) return { ok: false, error: "Administrador não encontrado." }

  if (target.id === actor.storeId) {
    return {
      ok: false,
      error: "Não é possível remover o proprietário da loja.",
    }
  }

  await db.delete(user).where(eq(user.id, userId))
  await logActivity({
    storeId: actor.storeId,
    action: `Administrador removido: ${target.email ?? userId}`,
    category: "admin",
    actor,
  })
  revalidatePath("/admins")
  return { ok: true }
}
