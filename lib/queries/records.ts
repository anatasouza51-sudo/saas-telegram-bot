import "server-only"
import { db } from "@/lib/db"
import { orders, customers, deliveries, products } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"

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

export async function getOrders(): Promise<OrderRow[]> {
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
    .orderBy(desc(orders.createdAt))
  return rows
}

export type CustomerRow = typeof customers.$inferSelect

export async function getCustomers(): Promise<CustomerRow[]> {
  return db.select().from(customers).orderBy(desc(customers.createdAt))
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

export async function getDeliveries(): Promise<DeliveryRow[]> {
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
    .orderBy(desc(deliveries.createdAt))
  return rows
}
