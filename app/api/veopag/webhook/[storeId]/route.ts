import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders, settings } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { verifyWebhookSignature, mapPaymentStatus } from "@/lib/veopag"
import { fulfillOrder } from "@/lib/fulfillment"
import { logActivity } from "@/lib/log"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params
  const rawBody = await req.text()
  const signature = req.headers.get("x-veopag-signature")

  // Load this store's VeoPag secret key to validate the signature.
  const [secretRow] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(eq(settings.ownerId, storeId), eq(settings.key, "veopag.secretKey")),
    )
  const secretKey = secretRow?.value

  if (!verifyWebhookSignature(secretKey, rawBody, signature)) {
    await logActivity({
      storeId,
      action: "Webhook VeoPag rejeitado (assinatura inválida)",
      category: "security",
    })
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
  }

  let payload: Record<string, any>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  // VeoPag identifies our order via the external_id we sent when creating the charge.
  const externalId = payload.external_id ?? payload.externalId
  const paymentId = String(payload.id ?? payload.transaction_id ?? "")
  const rawStatus = String(payload.status ?? payload.payment_status ?? "")
  const status = mapPaymentStatus(rawStatus)

  const orderId = Number(externalId)
  if (!orderId || Number.isNaN(orderId)) {
    return NextResponse.json({ error: "external_id ausente" }, { status: 400 })
  }

  // Scope the order to this store so webhooks can't touch other tenants.
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.ownerId, storeId)))
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
  }

  await db
    .update(orders)
    .set({ paymentStatus: status, paymentId, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.ownerId, storeId)))

  await logActivity({
    storeId,
    action: `Webhook VeoPag: pedido #${orderId} → ${status}`,
    category: "payment",
    details: `paymentId=${paymentId} status_bruto=${rawStatus}`,
  })

  // Auto-deliver on approval.
  if (status === "approved") {
    const result = await fulfillOrder(orderId)
    if (!result.ok) {
      await logActivity({
        storeId,
        action: `Falha na entrega automática do pedido #${orderId}`,
        category: "delivery",
        details: result.reason,
      })
      return NextResponse.json({
        received: true,
        delivered: false,
        reason: result.reason,
      })
    }
    return NextResponse.json({ received: true, delivered: true })
  }

  return NextResponse.json({ received: true })
}
