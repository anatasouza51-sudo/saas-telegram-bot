"use server"

import { db } from "@/lib/db"
import { coupons } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { and, eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type CouponInput = {
  code: string
  discountPercent: number
  maxUses?: number | null
  status?: "active" | "inactive"
  expiresAt?: string | null
}

export type Coupon = {
  id: number
  code: string
  discountPercent: number
  maxUses: number | null
  usedCount: number
  status: string
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function validateCouponCode(code: string): string {
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) throw new Error("Código do cupom é obrigatório.")
  if (trimmed.length < 3 || trimmed.length > 30)
    throw new Error("O código deve ter entre 3 e 30 caracteres.")
  if (!/^[A-Z0-9_-]+$/.test(trimmed))
    throw new Error("O código só pode conter letras, números, _ e -.")
  return trimmed
}

function validateDiscount(value: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 100)
    throw new Error("O desconto deve ser um número entre 1 e 100.")
  return Math.round(n)
}

export async function listCoupons(): Promise<Coupon[]> {
  const { storeId } = await requireCapability("products.manage")
  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.ownerId, storeId))
    .orderBy(desc(coupons.createdAt))
  return rows as Coupon[]
}

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  const user = await requireCapability("products.manage")
  const code = validateCouponCode(input.code)
  const discountPercent = validateDiscount(input.discountPercent)
  const maxUses =
    input.maxUses != null && input.maxUses > 0 ? Math.round(input.maxUses) : null
  const status = input.status === "inactive" ? "inactive" : "active"
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null

  // Check for duplicate code within the same store
  const [existing] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(and(eq(coupons.ownerId, user.storeId), eq(coupons.code, code)))
  if (existing) throw new Error(`Já existe um cupom com o código "${code}".`)

  const [row] = await db
    .insert(coupons)
    .values({
      ownerId: user.storeId,
      code,
      discountPercent,
      maxUses,
      status,
      expiresAt,
    })
    .returning()

  await logActivity({
    storeId: user.storeId,
    actorId: user.id,
    actorName: user.name,
    action: `Cupom "${code}" criado (${discountPercent}% de desconto)`,
    category: "system",
  })

  revalidatePath("/products")
  return row as Coupon
}

export async function updateCoupon(
  id: number,
  input: Partial<CouponInput>,
): Promise<Coupon> {
  const user = await requireCapability("products.manage")

  const [existing] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.ownerId, user.storeId)))
  if (!existing) throw new Error("Cupom não encontrado.")

  const updates: Partial<typeof coupons.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.code !== undefined) {
    updates.code = validateCouponCode(input.code)
    // Check duplicate only if code changed
    if (updates.code !== existing.code) {
      const [dup] = await db
        .select({ id: coupons.id })
        .from(coupons)
        .where(
          and(eq(coupons.ownerId, user.storeId), eq(coupons.code, updates.code)),
        )
      if (dup) throw new Error(`Já existe um cupom com o código "${updates.code}".`)
    }
  }
  if (input.discountPercent !== undefined)
    updates.discountPercent = validateDiscount(input.discountPercent)
  if (input.maxUses !== undefined)
    updates.maxUses =
      input.maxUses != null && input.maxUses > 0 ? Math.round(input.maxUses) : null
  if (input.status !== undefined)
    updates.status = input.status === "inactive" ? "inactive" : "active"
  if (input.expiresAt !== undefined)
    updates.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null

  const [row] = await db
    .update(coupons)
    .set(updates)
    .where(and(eq(coupons.id, id), eq(coupons.ownerId, user.storeId)))
    .returning()

  await logActivity({
    storeId: user.storeId,
    actorId: user.id,
    actorName: user.name,
    action: `Cupom "${existing.code}" atualizado`,
    category: "system",
  })

  revalidatePath("/products")
  return row as Coupon
}

export async function deleteCoupon(id: number): Promise<void> {
  const user = await requireCapability("products.manage")

  const [existing] = await db
    .select({ code: coupons.code })
    .from(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.ownerId, user.storeId)))
  if (!existing) throw new Error("Cupom não encontrado.")

  await db
    .delete(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.ownerId, user.storeId)))

  await logActivity({
    storeId: user.storeId,
    actorId: user.id,
    actorName: user.name,
    action: `Cupom "${existing.code}" excluído`,
    category: "system",
  })

  revalidatePath("/products")
}

export async function setCouponStatus(
  id: number,
  status: "active" | "inactive",
): Promise<void> {
  const user = await requireCapability("products.manage")

  const [existing] = await db
    .select({ code: coupons.code })
    .from(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.ownerId, user.storeId)))
  if (!existing) throw new Error("Cupom não encontrado.")

  await db
    .update(coupons)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(coupons.id, id), eq(coupons.ownerId, user.storeId)))

  await logActivity({
    storeId: user.storeId,
    actorId: user.id,
    actorName: user.name,
    action: `Cupom "${existing.code}" ${status === "active" ? "ativado" : "desativado"}`,
    category: "system",
  })

  revalidatePath("/products")
}

/**
 * Validates a coupon code for a given store. Returns the coupon if valid,
 * throws a descriptive error otherwise. Used by the Telegram bot.
 */
export async function validateCoupon(
  storeId: string,
  code: string,
): Promise<{ id: number; code: string; discountPercent: number }> {
  const upper = code.trim().toUpperCase()
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.ownerId, storeId), eq(coupons.code, upper)))

  if (!coupon) throw new Error("Cupom inválido ou não encontrado.")
  if (coupon.status !== "active") throw new Error("Este cupom está inativo.")
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    throw new Error("Este cupom expirou.")
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
    throw new Error("Este cupom atingiu o limite máximo de usos.")

  return {
    id: coupon.id,
    code: coupon.code,
    discountPercent: coupon.discountPercent,
  }
}

/**
 * Increments the usedCount of a coupon after a successful purchase.
 * Called internally by the bot after order approval.
 */
export async function incrementCouponUsage(
  storeId: string,
  code: string,
): Promise<void> {
  const upper = code.trim().toUpperCase()
  // Use raw SQL to atomically increment the counter.
  const { pool } = await import("@/lib/db")
  const client = await pool.connect()
  try {
    await client.query(
      `UPDATE coupons SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW() WHERE "ownerId" = $1 AND code = $2`,
      [storeId, upper],
    )
  } finally {
    client.release()
  }
}
