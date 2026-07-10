"use server"

import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { fulfillOrder } from "@/lib/fulfillment"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * Manually approve + deliver an order from the admin panel. Uses the same
 * fulfillment path as the VeoPag webhook, so delivery is atomic and logged.
 */
export async function approveAndDeliver(orderId: number) {
  const user = await requireCapability("orders.manage")
  const result = await fulfillOrder(orderId)
  if (!result.ok) {
    throw new Error(result.reason)
  }
  await logActivity({
    actor: user,
    action: `Aprovou e entregou manualmente o pedido #${orderId}`,
    category: "order",
  })
  revalidatePath("/orders")
  revalidatePath("/deliveries")
  revalidatePath("/")
  return { ok: true }
}

export async function refuseOrder(orderId: number) {
  const user = await requireCapability("orders.manage")
  await db
    .update(orders)
    .set({ paymentStatus: "refused", updatedAt: new Date() })
    .where(eq(orders.id, orderId))
  await logActivity({
    actor: user,
    action: `Recusou o pagamento do pedido #${orderId}`,
    category: "order",
  })
  revalidatePath("/orders")
  return { ok: true }
}

export async function cancelOrder(orderId: number) {
  const user = await requireCapability("orders.manage")
  await db
    .update(orders)
    .set({ paymentStatus: "cancelled", deliveryStatus: "cancelled", updatedAt: new Date() })
    .where(eq(orders.id, orderId))
  await logActivity({
    actor: user,
    action: `Cancelou o pedido #${orderId}`,
    category: "order",
  })
  revalidatePath("/orders")
  return { ok: true }
}
