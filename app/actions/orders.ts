"use server"

import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { fulfillOrder } from "@/lib/fulfillment"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function requireOwnedOrder(orderId: string, storeId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      type: orders.type,
      paymentStatus: orders.paymentStatus,
      deliveryStatus: orders.deliveryStatus,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.ownerId, storeId)))
  if (!order) throw new Error("Pedido não encontrado")
  return order
}

/**
 * Manually approve + deliver an order from the admin panel. Uses the same
 * fulfillment path as the VeoPag webhook, so delivery is atomic and logged.
 */
export async function approveAndDeliver(orderId: string) {
  const user = await requireCapability("orders.manage")
  const order = await requireOwnedOrder(orderId, user.storeId)
  if (order.type === "recharge") {
    throw new Error("Recargas só podem ser creditadas após confirmação da VeoPag")
  }
  if (order.deliveryStatus === "delivered") {
    throw new Error("Pedido já entregue")
  }
  const result = await fulfillOrder(orderId, user.storeId)
  if (!result.ok) {
    throw new Error(result.reason)
  }
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Aprovou e entregou manualmente o pedido #${orderId}`,
    category: "order",
  })
  revalidatePath("/orders")
  revalidatePath("/deliveries")
  revalidatePath("/")
  return { ok: true }
}

export async function refuseOrder(orderId: string) {
  const user = await requireCapability("orders.manage")
  const order = await requireOwnedOrder(orderId, user.storeId)
  if (order.deliveryStatus === "delivered" || order.paymentStatus === "approved") {
    throw new Error("Não é possível recusar um pedido já aprovado ou entregue")
  }
  await db
    .update(orders)
    .set({ paymentStatus: "refused", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.ownerId, user.storeId)))
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Recusou o pagamento do pedido #${orderId}`,
    category: "order",
  })
  revalidatePath("/orders")
  return { ok: true }
}

export async function cancelOrder(orderId: string) {
  const user = await requireCapability("orders.manage")
  const order = await requireOwnedOrder(orderId, user.storeId)
  if (order.deliveryStatus === "delivered" || order.paymentStatus === "approved") {
    throw new Error("Não é possível cancelar um pedido já aprovado ou entregue")
  }
  await db
    .update(orders)
    .set({
      paymentStatus: "cancelled",
      deliveryStatus: "cancelled",
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.ownerId, user.storeId)))
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Cancelou o pedido #${orderId}`,
    category: "order",
  })
  revalidatePath("/orders")
  return { ok: true }
}
