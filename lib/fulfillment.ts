import { pool, db } from "@/lib/db"
import {
  orders,
  products,
  customers,
  stockItems,
  deliveries,
  balanceTransactions,
} from "@/lib/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { logActivity } from "@/lib/log"
import { TelegramClient } from "@/lib/telegram"
import { settings, telegramChats } from "@/lib/db/schema"
import { escapeHtml } from "@/lib/security"
import { parsePixConfig } from "@/lib/pix"
import { formatCurrency } from "@/lib/format"

type FulfillResult =
  | {
      ok: true
      delivered: string
      orderId: string
      // False when the stock item was committed but the customer could not be
      // notified on Telegram. The order IS fulfilled — the caller must surface
      // this so an operator can resend the content manually.
      notified: boolean
      notifyError?: string
    }
  | { ok: false; reason: string; code: FulfillErrorCode }

export type FulfillErrorCode =
  | "not_found"
  | "already_delivered"
  | "no_stock"
  | "error"

/**
 * Approves a paid order and delivers a digital stock item exactly once.
 *
 * Concurrency-safe: the available stock item is claimed inside a transaction
 * using `FOR UPDATE SKIP LOCKED`, so two simultaneous approvals can never grab
 * the same item. The item is flipped to `sold` in the same transaction.
 */
export async function fulfillOrder(orderId: string): Promise<FulfillResult> {
  const claim = await claimStockItem(orderId)
  if (!claim.ok) return claim

  const { order, content, stockItemId } = claim

  // Side effects run after COMMIT: a failure here must never be reported as a
  // failed fulfillment, otherwise the caller retries an already-delivered order.
  const notify = order.type === "recharge" 
    ? await notifyRecharge(order)
    : await deliverToCustomer(order, content)
  if (!notify.ok) {
    console.error(
      `[fulfillment] order ${orderId} delivered but customer notification failed:`,
      notify.error,
    )
    await logActivity({
      storeId: order.ownerId,
      action: `Pedido #${orderId} entregue, mas o cliente não foi notificado no Telegram`,
      category: "delivery",
      details: notify.error,
    })
  }

  await logActivity({
    storeId: order.ownerId,
    action: `Pedido #${orderId} entregue automaticamente (item de estoque #${stockItemId})`,
    category: "delivery",
  })

  // Public sales log (Sales Proof)
  try {
    await broadcastSale(order)
  } catch (err) {
    console.error(`[fulfillment] failed to broadcast sale for order ${orderId}:`, err)
  }

  return {
    ok: true,
    delivered: content,
    orderId,
    notified: notify.ok,
    notifyError: notify.ok ? undefined : notify.error,
  }
}

type ClaimResult =
  | {
      ok: true
      order: DeliverableOrder & { ownerId: string }
      content: string
      stockItemId: number
    }
  | { ok: false; reason: string; code: FulfillErrorCode }

// Runs the transactional part of fulfillment: claims a stock item, flips the
// order to approved/delivered and records the delivery. No side effects.
async function claimStockItem(orderId: string): Promise<ClaimResult> {
  const client = await pool.connect()
  let committed = false
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
      return { ok: false, reason: "Pedido não encontrado", code: "not_found" }
    }

    // Idempotency: if already delivered, do nothing.
    if (order.deliveryStatus === "delivered") {
      await client.query("ROLLBACK")
      return {
        ok: false,
        reason: "Pedido já entregue",
        code: "already_delivered",
      }
    }

    // If it's a balance recharge, we don't claim stock items.
    if (order.type === "recharge") {
      if (order.customerId) {
        // Get current balance
        const customerRes = await client.query(
          `SELECT balance FROM customers WHERE id = $1 FOR UPDATE`,
          [order.customerId],
        )
        const customer = customerRes.rows[0]
        const previousBalance = Number(customer.balance)
        const amount = Number(order.amount)
        const newBalance = previousBalance + amount

        // Update balance
        await client.query(
          `UPDATE customers
           SET balance = $1, "totalSpent" = "totalSpent" + $2, "updatedAt" = now()
           WHERE id = $3`,
          [newBalance.toString(), amount.toString(), order.customerId],
        )

        // Record transaction
        await client.query(
          `INSERT INTO balance_transactions ("ownerId", "customerId", type, amount, "previousBalance", "newBalance", "orderId", description)
           VALUES ($1, $2, 'deposit', $3, $4, $5, $6, 'Recarga de saldo')`,
          [order.ownerId, order.customerId, amount.toString(), previousBalance.toString(), newBalance.toString(), orderId],
        )
      }

      // Mark order approved + delivered (recharge is "delivered" once balance is added)
      await client.query(
        `UPDATE orders
         SET "paymentStatus" = 'approved', "deliveryStatus" = 'delivered', "updatedAt" = now()
         WHERE id = $1`,
        [orderId],
      )

      await client.query("COMMIT")
      committed = true
      return { ok: true, order, content: "RECHARGE", stockItemId: 0 }
    }

    // --- Standard Product Flow ---
    // Claim one available stock item without racing other transactions.
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
      return { ok: false, reason: "Sem estoque disponível", code: "no_stock" }
    }

    await client.query(
      `UPDATE stock_items
       SET status = 'sold', "orderId" = $1, "soldAt" = now()
       WHERE id = $2`,
      [orderId, item.id],
    )

    await client.query(
      `UPDATE orders
       SET "paymentStatus" = 'approved', "deliveryStatus" = 'delivered', "updatedAt" = now()
       WHERE id = $1`,
      [orderId],
    )

    await client.query(
      `INSERT INTO deliveries ("ownerId", "orderId", "productId", "customerId", "stockItemId", "deliveredContent", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'delivered')`,
      [order.ownerId, orderId, order.productId, order.customerId, item.id, item.content],
    )

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
    committed = true

    return { ok: true, order, content: item.content, stockItemId: item.id }
  } catch (err) {
    if (!committed) {
      // The rollback itself can fail (e.g. the connection dropped); that must
      // not mask the original error.
      try {
        await client.query("ROLLBACK")
      } catch (rollbackErr) {
        console.error(
          `[fulfillment] rollback failed for order ${orderId}:`,
          rollbackErr,
        )
      }
    }
    console.error(`[fulfillment] order ${orderId} failed:`, err)
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Erro na entrega",
      code: "error",
    }
  } finally {
    client.release()
  }
}

type DeliverableOrder = {
  id: string
  ownerId: string
  customerId: string | null
  productName: string | null
  pixChatId?: string | null
  pixMessageId?: number | null
}

// Notifies the customer on Telegram. Returns a result instead of throwing so a
// notification failure is reported without rolling back a committed delivery.
async function deliverToCustomer(
  order: DeliverableOrder,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    return await sendDeliveryMessage(order, content)
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao notificar o cliente",
    }
  }
}

async function notifyRecharge(
  order: DeliverableOrder & { amount: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!order.customerId) return { ok: false, error: "Pedido sem cliente vinculado" }
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
  if (!customer?.telegramId) {
    return { ok: false, error: "Cliente sem Telegram vinculado" }
  }

  const [setting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.ownerId, order.ownerId),
        eq(settings.key, "telegram.botToken"),
      ),
    )
  if (!setting?.value) return { ok: false, error: "Token do bot não configurado" }

  const client = new TelegramClient(setting.value)
  const amount = formatCurrency(Number(order.amount))
  const newBalance = formatCurrency(Number(customer.balance))

  const message = [
    `<b>💰 Saldo Adicionado!</b>`,
    ``,
    `Sua recarga de <b>${amount}</b> foi aprovada com sucesso.`,
    `Seu novo saldo é: <b>${newBalance}</b>`,
    ``,
    `Você já pode usar este saldo para realizar compras no bot!`,
  ].join("\n")

  const sent = await client.sendMessage(customer.telegramId, message)
  if (!sent.ok) {
    return { ok: false, error: sent.description ?? "Falha ao enviar no Telegram" }
  }
  return { ok: true }
}

async function sendDeliveryMessage(
  order: DeliverableOrder,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!order.customerId) return { ok: false, error: "Pedido sem cliente vinculado" }
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
  if (!customer?.telegramId) {
    return { ok: false, error: "Cliente sem Telegram vinculado" }
  }

  // Load this store's bot token + PIX config (for the approved message text).
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.ownerId, order.ownerId),
        inArray(settings.key, ["telegram.botToken", "pix.config"]),
      ),
    )
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value ?? ""
  const token = map["telegram.botToken"]
  if (!token) return { ok: false, error: "Token do bot não configurado" }
  const pix = parsePixConfig(map["pix.config"])

  const client = new TelegramClient(token)

  // First, flip the original PIX message ("Aguardando") to "Aprovado" in place,
  // removing the payment buttons so it can't be paid/cancelled again.
  if (order.pixChatId && order.pixMessageId) {
    const approvedCaption = [
      `🧾 <b>Pedido #${order.id}</b>`,
      ``,
      pix.approvedMessage,
    ].join("\n")
    const res = await client.editMessageCaption(
      order.pixChatId,
      order.pixMessageId,
      approvedCaption,
    )
    if (!res.ok && !(res.description ?? "").toLowerCase().includes("not modified")) {
      // Fallback for the text-only variant of the PIX message. Cosmetic: the
      // product delivery below is what actually matters.
      const edit = await client.editMessageText(
        order.pixChatId,
        order.pixMessageId,
        approvedCaption,
      )
      if (!edit.ok) {
        console.error(
          `[fulfillment] could not flip PIX message for order ${order.id}:`,
          edit.description ?? res.description,
        )
      }
    }
  }

  // Then deliver the product content as a new message.
  const message = [
    `<b>✅ Pagamento aprovado!</b>`,
    ``,
    `Aqui está o seu produto: <b>${escapeHtml(order.productName ?? "Produto digital")}</b>`,
    ``,
    `<code>${escapeHtml(content)}</code>`,
    ``,
    `Obrigado pela compra! Use /suporte se precisar de ajuda.`,
  ].join("\n")

  const sent = await client.sendMessage(customer.telegramId, message)
  if (!sent.ok) {
    return { ok: false, error: sent.description ?? "Falha ao enviar no Telegram" }
  }
  return { ok: true }
}

async function broadcastSale(order: any) {
  // 1. Find the "Log" group/channel for this store
  const [logChat] = await db
    .select()
    .from(telegramChats)
    .where(
      and(
        eq(telegramChats.ownerId, order.ownerId),
        eq(telegramChats.purpose, "management"), // Using management as logs destination
        eq(telegramChats.status, "active"),
      ),
    )
    .limit(1)

  if (!logChat) return

  // 2. Load bot token
  const [setting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.ownerId, order.ownerId),
        eq(settings.key, "telegram.botToken"),
      ),
    )
    .limit(1)

  if (!setting?.value) return

  // 3. Get customer name
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))

  const customerName = customer?.username 
    ? `@${customer.username}` 
    : (customer?.name || "Cliente")

  const client = new TelegramClient(setting.value)
  const message = [
    `🔥 <b>NOVA VENDA REALIZADA!</b>`,
    ``,
    `👤 <b>Cliente:</b> ${escapeHtml(customerName)}`,
    `📦 <b>Produto:</b> ${escapeHtml(order.productName || "Produto Digital")}`,
    `💰 <b>Valor:</b> ${formatCurrency(Number(order.amount))}`,
    ``,
    `✅ <i>Pagamento aprovado e entrega realizada com sucesso.</i>`,
  ].join("\n")

  await client.sendMessage(logChat.chatId, message)
}
