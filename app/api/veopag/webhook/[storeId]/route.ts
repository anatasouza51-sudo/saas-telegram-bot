import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { mapPaymentStatus } from "@/lib/veopag"
import { fulfillOrder } from "@/lib/fulfillment"
import { logActivity } from "@/lib/log"

/**
 * VeoPag deposit webhook. VeoPag posts here when a charge changes status
 * (COMPLETED / FAILED). Security model:
 *  - The URL contains the store's unguessable id (per-tenant secret path).
 *  - Every DB write is scoped to that store's ownerId.
 *  - We match the order via `external_id`, which we set to our order id.
 * VeoPag sends an `Authorization: Bearer <CLIENT_CALLBACK_TOKEN>` header and,
 * optionally, an `X-Webhook-Signature`. We accept the callback and rely on the
 * secret path + order scoping, then reconcile the real status from the payload.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params

  let payload: Record<string, any>
  try {
    payload = (await req.json()) as Record<string, any>
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  // VeoPag identifies our order via the external_id we sent when creating the charge.
  const externalId = payload.external_id ?? payload.externalId
  const paymentId = String(
    payload.transaction_id ?? payload.transactionId ?? payload.id ?? "",
  )
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
