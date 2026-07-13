import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * Public payment status endpoint, keyed by the order's unguessable publicToken.
 * The browser payment page polls this to update the status in real time.
 *
 * No secrets are exposed: only status, delivery flag and expiry are returned.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const [order] = await db
    .select({
      paymentStatus: orders.paymentStatus,
      deliveryStatus: orders.deliveryStatus,
      expiresAt: orders.expiresAt,
    })
    .from(orders)
    .where(eq(orders.publicToken, token))
    .limit(1)

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const expired =
    order.paymentStatus === "pending" &&
    order.expiresAt != null &&
    Date.now() > order.expiresAt.getTime()

  const status =
    order.paymentStatus === "approved"
      ? "approved"
      : order.paymentStatus === "cancelled"
        ? "cancelled"
        : order.paymentStatus === "refused"
          ? "refused"
          : expired
            ? "expired"
            : "pending"

  return NextResponse.json(
    {
      status,
      delivered: order.deliveryStatus === "delivered",
      expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
