import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { and, eq, ne } from "drizzle-orm"
import { fulfillOrder } from "@/lib/fulfillment"
import { logActivity } from "@/lib/log"
import { getWebhookSecret } from "@/lib/webhook-secrets"
import { safeEqual, rateLimit, clientIpFrom, hashIp } from "@/lib/security"
import { normalizeProviderStatus } from "@/lib/payment-provider"

/**
 * Mistic Pay deposit webhook.
 *
 * The public provider contract does not document a signature header, so the
 * callback URL contains an unguessable per-store secret generated locally.
 * Every lookup and write remains scoped to ownerId, and the handler never
 * trusts a provider event to downgrade an approved or delivered order.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; secret: string }> },
) {
  const { storeId, secret } = await params
  const ip = clientIpFrom(req)
  const limit = await rateLimit(`misticpay:${storeId}:${hashIp(ip)}`, {
    max: 60,
    windowMs: 60_000,
    namespace: "webhook",
  })
  if (!limit.ok) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })

  let expected: string | null = null
  try {
    expected = await getWebhookSecret(storeId, "misticpay")
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!expected || !safeEqual(secret, expected)) {
    await logActivity({
      storeId,
      action: "Webhook Mistic Pay rejeitado: segredo inválido",
      category: "security",
      details: `ip=${ip}`,
    })
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const transactionId = String(payload.transactionId ?? "").trim().slice(0, 200)
  const rawStatus = String(payload.status ?? "")
  const status = normalizeProviderStatus(rawStatus)
  if (!transactionId || !rawStatus) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, transactionId), eq(orders.ownerId, storeId)))
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (
    order.deliveryStatus === "delivered" ||
    (order.paymentStatus === "approved" && status !== "approved")
  ) {
    return NextResponse.json({ received: true, idempotent: true })
  }

  if (order.paymentId === transactionId && order.paymentStatus === status && status !== "approved") {
    return NextResponse.json({ received: true, idempotent: true })
  }

  const rawValue = payload.value
  if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
    const webhookAmountCents = Number(rawValue)
    const orderAmountCents = Math.round(Number(order.amount) * 100)
    if (!Number.isFinite(webhookAmountCents) || Math.abs(webhookAmountCents - orderAmountCents) > 1) {
      await logActivity({
        storeId,
        action: "Webhook Mistic Pay rejeitado: valor divergente",
        category: "security",
        details: `order=${order.id} ip=${ip}`,
      })
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
  }

  const [updated] = await db
    .update(orders)
    .set({ paymentStatus: status, paymentId: transactionId, updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, transactionId),
        eq(orders.ownerId, storeId),
        ne(orders.deliveryStatus, "delivered"),
        ne(orders.paymentStatus, "approved"),
      ),
    )
    .returning({ id: orders.id })

  if (!updated && status !== "approved") return NextResponse.json({ received: true, idempotent: true })

  await logActivity({
    storeId,
    action: `Webhook Mistic Pay: pagamento processado (${status})`,
    category: "payment",
    details: `order=${order.id}`,
  })

  if (status === "approved") {
    const result = await fulfillOrder(transactionId, storeId)
    if (!result.ok) {
      await logActivity({
        storeId,
        action: "Falha na entrega automática após webhook Mistic Pay",
        category: "delivery",
        details: "fulfillment_failed",
      })
      return NextResponse.json({ received: true, delivered: false })
    }
    return NextResponse.json({ received: true, delivered: true, notified: result.notified })
  }

  return NextResponse.json({ received: true })
}
