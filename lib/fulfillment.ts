import { pool, db } from "@/lib/db"
import {
  orders,
  products,
  customers,
  stockItems,
  deliveries,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logActivity } from "@/lib/log"
import { sendMessage } from "@/lib/telegram"

type FulfillResult =
  | { ok: true; delivered: string; orderId: number }
  | { ok: false; reason: string }

/**
 * Approves a paid order and delivers a digital stock item exactly once.
 *
 * Concurrency-safe: the available stock item is claimed inside a transaction
 * using `FOR UPDATE SKIP LOCKED`, so two simultaneous approvals can never grab
 * the same item. The item is flipped to `sold` in the same transaction.
 */
export async function fulfillOrder(orderId: number): Promise<FulfillResult> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Lock the order row so a concurrent webhook can't double-process it.
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    const order = orderRes.rows[0]
    if (!order) {
      await client.query("ROLLBACK")
      return { ok: false, reason: "Pedido não encontrado" }
    }

    // Idempotency: if already delivered, do nothing.
    if (order.deliveryStatus === "delivered") {
      await client.query("ROLLBACK")
      return { ok: false, reason: "Pedido já entregue" }
    }

    // Claim one available stock item without racing other transactions.
    const stockRes = await client.query(
      `SELECT id, content FROM stock_items
       WHERE "productId" = $1 AND status = 'available'
       ORDER BY id ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [order.productId],
    )
    const item = stockRes.rows[0]
    if (!item) {
      await client.query("ROLLBACK")
      return { ok: false, reason: "Sem estoque disponível" }
    }

    // Mark item sold, bind it to this order.
    await client.query(
      `UPDATE stock_items
       SET status = 'sold', "orderId" = $1, "soldAt" = now()
       WHERE id = $2`,
      [orderId, item.id],
    )

    // Mark order approved + delivered.
    await client.query(
      `UPDATE orders
       SET "paymentStatus" = 'approved', "deliveryStatus" = 'delivered', "updatedAt" = now()
       WHERE id = $1`,
      [orderId],
    )

    // Record the delivery.
    await client.query(
      `INSERT INTO deliveries ("orderId", "productId", "customerId", "stockItemId", "deliveredContent", status)
       VALUES ($1, $2, $3, $4, $5, 'delivered')`,
      [orderId, order.productId, order.customerId, item.id, item.content],
    )

    // Update customer aggregates.
    if (order.customerId) {
      await client.query(
        `UPDATE customers
         SET "totalSpent" = "totalSpent" + $1,
             "purchaseCount" = "purchaseCount" + 1,
             "lastPurchaseAt" = now()
         WHERE id = $2`,
        [order.amount, order.customerId],
      )
    }

    await client.query("COMMIT")

    // Deliver via Telegram (outside the transaction).
    await deliverToCustomer(order, item.content)

    await logActivity({
      action: `Pedido #${orderId} entregue automaticamente (item de estoque #${item.id})`,
      category: "delivery",
    })

    return { ok: true, delivered: item.content, orderId }
  } catch (err) {
    await client.query("ROLLBACK")
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Erro na entrega",
    }
  } finally {
    client.release()
  }
}

async function deliverToCustomer(
  order: { customerId: number | null; productName: string | null },
  content: string,
) {
  if (!order.customerId) return
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
  if (!customer?.telegramId) return

  const message = [
    `<b>✅ Pagamento aprovado!</b>`,
    ``,
    `Aqui está o seu produto: <b>${order.productName ?? "Produto digital"}</b>`,
    ``,
    `<code>${content}</code>`,
    ``,
    `Obrigado pela compra! Use /suporte se precisar de ajuda.`,
  ].join("\n")

  await sendMessage(customer.telegramId, message)
}
