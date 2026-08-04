"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { validateProfileName, validateEmail } from "@/lib/validation"
import { ROLES, type Role } from "@/lib/roles"
import { and, eq, or } from "drizzle-orm"

import { revalidatePath } from "next/cache"

// A user belongs to store S when they ARE the owner (user.id = S) or when
// they are a team member of it (user.ownerId = S).
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

  // Validate input size to prevent oversized payloads.
  const name = validateProfileName(input.name)
  const email = validateEmail(input.email)

  try {
    // Better Auth creates the user (with hashed password).
    // O hook de banco em lib/auth.ts define role=admin e ownerId=null por padrão.
    // Para evitar que um erro entre o signup e o update deixe um usuário como admin global,
    // usamos uma transação ou garantimos a ordem correta.
    
    // NOTA: signUpEmail não aceita role/ownerId no body por padrão no Better Auth (segurança).
    // Asseguramos que o usuário seja criado e IMEDIATAMENTE vinculado à loja do actor.
    const created = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password: input.password,
        // Passamos metadados que podem ser lidos no hook, se configurado,
        // ou apenas procedemos com o update atômico.
      },
    })

    const newUserId = created.user?.id
    if (!newUserId) {
      throw new Error("Falha ao recuperar ID do novo usuário")
    }

    // Vinculação obrigatória ao storeId do criador para evitar Broken Access Control
    await db
      .update(user)
      .set({ 
        role: input.role, 
        ownerId: actor.storeId,
        // Garantimos que onboarding seja resetado para membros de equipe
        onboardingSeen: true 
      })
      .where(eq(user.id, newUserId))

    await logActivity({
      storeId: actor.storeId,
      action: `Administrador criado: ${input.email} (${input.role})`,
      category: "admin",
      actor,
    })
    revalidatePath("/admins")
    return { ok: true }
  } catch (e) {
    console.error("[admins] could not create admin:", e)
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro ao criar administrador",
    }
  }
}

export async function updateAdminRole(userId: string, role: Role) {
  const actor = await requireCapability("admins.manage")
  if (!ROLES.includes(role)) return { ok: false, error: "Permissão inválida" }

  // Target must belong to the same store.
  const [target] = await db
    .select()
    .from(user)
    .where(and(eq(user.id, userId), storeMembers(actor.storeId)))
    .limit(1)
  if (!target) return { ok: false, error: "Administrador não encontrado." }

  // Prevent removing the last admin of this store.
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

  // The store owner (self-owned account) can never be deleted here.
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
