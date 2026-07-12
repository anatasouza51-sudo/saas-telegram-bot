import { pool, db } from "@/lib/db"
import {
  orders,
  products,
  customers,
  stockItems,
  deliveries,
} from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { logActivity } from "@/lib/log"
import { TelegramClient } from "@/lib/telegram"
import { settings } from "@/lib/db/schema"
import { escapeHtml } from "@/lib/security"

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
    // Scoped to the order's store so items never cross tenants.
    const stockRes = await client.query(
      `SELECT id, content FROM stock_items
       WHERE "productId" = $1 AND "ownerId" = $2 AND status = 'available'
       ORDER BY id ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [order.productId, order.ownerId],
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
      `INSERT INTO deliveries ("ownerId", "orderId", "productId", "customerId", "stockItemId", "deliveredContent", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'delivered')`,
      [order.ownerId, orderId, order.productId, order.customerId, item.id, item.content],
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

    // Deliver via Telegram (outside the transaction), using this store's bot.
    await deliverToCustomer(order, item.content)
    // (order carries ownerId, customerId, productName — used below)

    await logActivity({
      storeId: order.ownerId,
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
  order: {
    ownerId: string
    customerId: number | null
    productName: string | null
  },
  content: string,
) {
  if (!order.customerId) return
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
  if (!customer?.telegramId) return

  // Load this store's bot token.
  const [tokenRow] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.ownerId, order.ownerId),
        eq(settings.key, "telegram.botToken"),
      ),
    )
  const token = tokenRow?.value
  if (!token) return

  const message = [
    `<b>✅ Pagamento aprovado!</b>`,
    ``,
    `Aqui está o seu produto: <b>${escapeHtml(order.productName ?? "Produto digital")}</b>`,
    ``,
    `<code>${escapeHtml(content)}</code>`,
    ``,
    `Obrigado pela compra! Use /suporte se precisar de ajuda.`,
  ].join("\n")

  const client = new TelegramClient(token)
  await client.sendMessage(customer.telegramId, message)
}
