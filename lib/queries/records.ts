import "server-only"
import { db } from "@/lib/db"
import { orders, customers, deliveries, products } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"

export type OrderRow = {
  id: number
  productName: string | null
  amount: string
  paymentStatus: string
  deliveryStatus: string
  gateway: string
  paymentId: string | null
  createdAt: Date
  customerName: string | null
  customerUsername: string | null
  customerTelegramId: string | null
}

export async function getOrders(storeId: string): Promise<OrderRow[]> {
  const rows = await db
    .select({
      id: orders.id,
      productName: orders.productName,
      amount: orders.amount,
      paymentStatus: orders.paymentStatus,
      deliveryStatus: orders.deliveryStatus,
      gateway: orders.gateway,
      paymentId: orders.paymentId,
      createdAt: orders.createdAt,
      customerName: customers.name,
      customerUsername: customers.username,
      customerTelegramId: customers.telegramId,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.ownerId, storeId))
    .orderBy(desc(orders.createdAt))
  return rows
}

export type CustomerRow = typeof customers.$inferSelect

export async function getCustomers(storeId: string): Promise<CustomerRow[]> {
  return db
    .select()
    .from(customers)
    .where(eq(customers.ownerId, storeId))
    .orderBy(desc(customers.createdAt))
}

export type DeliveryRow = {
  id: number
  orderId: number
  status: string
  deliveredContent: string | null
  createdAt: Date
  productName: string | null
  customerName: string | null
  customerTelegramId: string | null
}

export async function getDeliveries(storeId: string): Promise<DeliveryRow[]> {
  const rows = await db
    .select({
      id: deliveries.id,
      orderId: deliveries.orderId,
      status: deliveries.status,
      deliveredContent: deliveries.deliveredContent,
      createdAt: deliveries.createdAt,
      productName: products.name,
      customerName: customers.name,
      customerTelegramId: customers.telegramId,
    })
    .from(deliveries)
    .leftJoin(products, eq(deliveries.productId, products.id))
    .leftJoin(customers, eq(deliveries.customerId, customers.id))
    .where(eq(deliveries.ownerId, storeId))
    .orderBy(desc(deliveries.createdAt))
  return rows
}

export type LogRow = typeof import("@/lib/db/schema").activityLogs.$inferSelect

export async function getLogs(storeId: string, limit = 200) {
  const { activityLogs } = await import("@/lib/db/schema")
  return db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.ownerId, storeId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
}
