import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyWebhookSignature, mapPaymentStatus } from "@/lib/veopag"
import { fulfillOrder } from "@/lib/fulfillment"
import { logActivity } from "@/lib/log"

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-veopag-signature")

  if (!verifyWebhookSignature(rawBody, signature)) {
    await logActivity({
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

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId))
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
  }

  // Persist the payment status + gateway id.
  await db
    .update(orders)
    .set({ paymentStatus: status, paymentId, updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  await logActivity({
    action: `Webhook VeoPag: pedido #${orderId} → ${status}`,
    category: "payment",
    details: `paymentId=${paymentId} status_bruto=${rawStatus}`,
  })

  // Auto-deliver on approval.
  if (status === "approved") {
    const result = await fulfillOrder(orderId)
    if (!result.ok) {
      await logActivity({
        action: `Falha na entrega automática do pedido #${orderId}`,
        category: "delivery",
        details: result.reason,
      })
      return NextResponse.json({ received: true, delivered: false, reason: result.reason })
    }
    return NextResponse.json({ received: true, delivered: true })
  }

  return NextResponse.json({ received: true })
}
