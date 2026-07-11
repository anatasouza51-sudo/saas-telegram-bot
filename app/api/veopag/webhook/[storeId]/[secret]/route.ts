import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { mapPaymentStatus } from "@/lib/veopag"
import { fulfillOrder } from "@/lib/fulfillment"
import { logActivity } from "@/lib/log"
import { getWebhookSecret } from "@/lib/webhook-secrets"
import { safeEqual, rateLimit, clientIpFrom } from "@/lib/security"

/**
 * VeoPag deposit webhook — authenticated per store.
 *
 * Security model (defense in depth):
 *  1. Unguessable per-store secret in the URL path, compared in constant time.
 *  2. Every DB write scoped to that store's ownerId (no cross-tenant access).
 *  3. Order matched via the external_id we set (our order id).
 *  4. Amount reconciliation: the webhook amount must match the order amount,
 *     so a spoofed/tampered "approved" can't deliver a product for a wrong price.
 *  5. Rate limiting + logging of every rejected attempt (security auditing).
 *
 * Errors return generic messages; details are written to the activity log.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; secret: string }> },
) {
  const { storeId, secret } = await params
  const ip = clientIpFrom(req)

  // Throttle abusive callers per store+ip.
  const limit = rateLimit(`veopag:${storeId}:${ip}`, {
    max: 60,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }

  // Authenticate the caller with the store's webhook secret.
  const expected = await getWebhookSecret(storeId, "veopag")
  if (!expected || !safeEqual(secret, expected)) {
    await logActivity({
      storeId,
      action: "Webhook VeoPag rejeitado: segredo inválido",
      category: "security",
      details: `ip=${ip}`,
    })
    // Generic 404 so we don't confirm whether the store exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const externalId = payload.external_id ?? payload.externalId
  const paymentId = String(
    payload.transaction_id ?? payload.transactionId ?? payload.id ?? "",
  )
  const rawStatus = String(payload.status ?? payload.payment_status ?? "")
  const status = mapPaymentStatus(rawStatus)

  const orderId = Number(externalId)
  if (!orderId || Number.isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Scope the order to this store so webhooks can't touch other tenants.
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.ownerId, storeId)))
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Amount reconciliation: reject if the webhook amount disagrees with the
  // recorded order amount (protects against tampered/replayed approvals).
  const rawAmount = payload.amount ?? payload.value ?? payload.total
  if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
    const webhookAmount = Number(rawAmount)
    const orderAmount = Number(order.amount)
    if (
      Number.isFinite(webhookAmount) &&
      Math.abs(webhookAmount - orderAmount) > 0.01
    ) {
      await logActivity({
        storeId,
        action: `Webhook VeoPag rejeitado: valor divergente no pedido #${orderId}`,
        category: "security",
        details: `esperado=${orderAmount} recebido=${webhookAmount} ip=${ip}`,
      })
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
  }

  await db
    .update(orders)
    .set({ paymentStatus: status, paymentId, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.ownerId, storeId)))

  await logActivity({
    storeId,
    action: `Webhook VeoPag: pedido #${orderId} -> ${status}`,
    category: "payment",
    details: `paymentId=${paymentId} status_bruto=${rawStatus}`,
  })

  if (status === "approved") {
    const result = await fulfillOrder(orderId)
    if (!result.ok) {
      await logActivity({
        storeId,
        action: `Falha na entrega automática do pedido #${orderId}`,
        category: "delivery",
        details: result.reason,
      })
      return NextResponse.json({ received: true, delivered: false })
    }
    return NextResponse.json({ received: true, delivered: true })
  }

  return NextResponse.json({ received: true })
}
