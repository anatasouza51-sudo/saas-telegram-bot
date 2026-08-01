"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { ROLES, type Role } from "@/lib/roles"
import { and, eq, or } from "drizzle-orm"
import { auth, clerkClient } from "@clerk/nextjs/server"

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

  try {
    // Create user in Clerk first (handles password hashing)
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [input.email],
      password: input.password,
      firstName: input.name.split(" ")[0],
      lastName: input.name.split(" ").slice(1).join(" ") || undefined,
    })

    const clerkUserId = clerkUser.id

    // Insert the app-level user record in our DB
    await db.insert(user).values({
      id: clerkUserId,
      name: input.name,
      email: input.email,
      role: input.role,
      ownerId: actor.storeId,
    })

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

  // Delete from DB
  await db.delete(user).where(eq(user.id, userId))

  // Also delete from Clerk
  try {
    await clerkClient.users.deleteUser(userId)
  } catch (clerkErr) {
    console.error("[admins] Clerk delete failed:", clerkErr)
    // Non-fatal: the DB record is already gone
  }

  await logActivity({
    storeId: actor.storeId,
    action: `Administrador removido: ${target.email ?? userId}`,
    category: "admin",
    actor,
  })
  revalidatePath("/admins")
  return { ok: true }
}
