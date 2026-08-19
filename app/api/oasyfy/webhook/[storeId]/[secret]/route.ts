import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { and, eq, ne } from "drizzle-orm"
import { fulfillOrder } from "@/lib/fulfillment"
import { logActivity } from "@/lib/log"
import { getWebhookSecret } from "@/lib/webhook-secrets"
import { getSetting } from "@/lib/settings"
import { parseOasyfyWebhookPayload } from "@/lib/oasyfy"
import { safeEqual, rateLimit, clientIpFrom, hashIp } from "@/lib/security"

const SUPPORTED_EVENTS = new Set([
  "TRANSACTION_CREATED",
  "TRANSACTION_PAID",
  "TRANSACTION_CANCELED",
  "TRANSACTION_REFUNDED",
  "TRANSACTION_CHARGED_BACK",
])

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; secret: string }> },
) {
  const { storeId, secret } = await params
  const ip = clientIpFrom(req)
  const limit = await rateLimit(`oasyfy:${storeId}:${hashIp(ip)}`, {
    max: 60,
    windowMs: 60_000,
    namespace: "webhook",
  })
  if (!limit.ok) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })

  const expectedUrlSecret = await getWebhookSecret(storeId, "oasyfy")
  if (!expectedUrlSecret || !safeEqual(secret, expectedUrlSecret)) {
    await logActivity({
      storeId,
      action: "Webhook Oasy.fy rejeitado: segredo inválido",
      category: "security",
      details: `ip=${ip}`,
    })
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const parsed = parseOasyfyWebhookPayload(payload)
  if (!parsed || !SUPPORTED_EVENTS.has(parsed.event)) {
    await logActivity({
      storeId,
      action: "Webhook Oasy.fy rejeitado: evento ou identificador inválido",
      category: "security",
      details: `ip=${ip}`,
    })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const configuredProviderToken = await getSetting(storeId, "oasyfy.webhookToken", { revealSensitive: true })
  if (configuredProviderToken && (!parsed.token || !safeEqual(parsed.token, configuredProviderToken))) {
    await logActivity({
      storeId,
      action: "Webhook Oasy.fy rejeitado: token do provedor inválido",
      category: "security",
      details: `ip=${ip}`,
    })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, parsed.orderId), eq(orders.ownerId, storeId)))
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (order.paymentId && order.paymentId !== parsed.paymentId) {
    await logActivity({
      storeId,
      action: `Webhook Oasy.fy rejeitado: transação divergente no pedido #${order.id}`,
      category: "security",
      details: `ip=${ip}`,
    })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  if (order.deliveryStatus === "delivered" || (order.paymentStatus === "approved" && parsed.status !== "approved")) {
    return NextResponse.json({ received: true, idempotent: true })
  }

  if (order.paymentId === parsed.paymentId && order.paymentStatus === parsed.status && parsed.status !== "approved") {
    return NextResponse.json({ received: true, idempotent: true })
  }

  const orderAmountCents = Math.round(Number(order.amount) * 100)
  if (parsed.amountCents != null && Math.abs(parsed.amountCents - orderAmountCents) > 1) {
    await logActivity({
      storeId,
      action: `Webhook Oasy.fy rejeitado: valor divergente no pedido #${order.id}`,
      category: "security",
      details: `esperado_centavos=${orderAmountCents} recebido_centavos=${parsed.amountCents} ip=${ip}`,
    })
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: parsed.status,
      paymentId: parsed.paymentId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orders.id, parsed.orderId),
        eq(orders.ownerId, storeId),
        ne(orders.deliveryStatus, "delivered"),
        ne(orders.paymentStatus, "approved"),
      ),
    )
    .returning({ id: orders.id })

  if (!updated && parsed.status !== "approved") {
    return NextResponse.json({ received: true, idempotent: true })
  }

  await logActivity({
    storeId,
    action: `Webhook Oasy.fy: pedido #${parsed.orderId} -> ${parsed.status}`,
    category: "payment",
    details: `event=${parsed.event}`,
  })

  if (parsed.status === "approved") {
    const result = await fulfillOrder(parsed.orderId, storeId)
    if (!result.ok) {
      await logActivity({
        storeId,
        action: `Falha na entrega automática do pedido #${parsed.orderId}`,
        category: "delivery",
        details: result.reason,
      })
      return NextResponse.json({ received: true, delivered: false })
    }
    return NextResponse.json({
      received: true,
      delivered: true,
      notified: result.notified,
    })
  }

  return NextResponse.json({ received: true })
}
