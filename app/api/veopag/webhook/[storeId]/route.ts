import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { mapPaymentStatus } from "@/lib/veopag"
import { fulfillOrder } from "@/lib/fulfillment"
import { logActivity } from "@/lib/log"
import { verifyWebhookToken } from "@/lib/webhook-security"
import { rateLimit, clientIp } from "@/lib/rate-limit"

/**
 * VeoPag deposit webhook. Security model (defense in depth):
 *  1. Authenticity: the callback URL we register with VeoPag carries an
 *     unguessable per-store token (?token=). We verify it timing-safely.
 *     Without a valid token the request is rejected and logged.
 *  2. Tenant isolation: every DB read/write is scoped to this store's ownerId.
 *  3. Rate limiting: per-IP, to blunt spam/abuse.
 * The real payment status is always reconciled from the payload, never trusted
 * blindly from a status string alone.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params
  const ip = clientIp(req)

  const { allowed } = await rateLimit(`veopag:${ip}`, 60, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 })
  }

  // Authenticity check — token lives in the callback URL only we + VeoPag know.
  const token = new URL(req.url).searchParams.get("token")
  if (!verifyWebhookToken("veopag", storeId, token)) {
    await logActivity({
      storeId,
      action: "Tentativa de webhook VeoPag inválida (token ausente/incorreto)",
      category: "security",
      details: `ip=${ip}`,
    })
    // Generic response — do not reveal why it failed.
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }

  const externalId = (payload.external_id ?? payload.externalId) as unknown
  const paymentId = String(
    payload.transaction_id ?? payload.transactionId ?? payload.id ?? "",
  )
  const rawStatus = String(payload.status ?? payload.payment_status ?? "")
  const status = mapPaymentStatus(rawStatus)

  const orderId = Number(externalId)
  if (!orderId || Number.isNaN(orderId)) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 })
  }

  // Scope the order to this store so webhooks can't touch other tenants.
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.ownerId, storeId)))
  if (!order) {
    // Generic 404 — do not confirm/deny existence of resources cross-tenant.
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
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
      return NextResponse.json({ received: true, delivered: false })
    }
    return NextResponse.json({ received: true, delivered: true })
  }

  return NextResponse.json({ received: true })
}
