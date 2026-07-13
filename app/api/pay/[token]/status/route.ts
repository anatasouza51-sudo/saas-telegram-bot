import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { rateLimit, clientIpFrom } from "@/lib/security"

/**
 * Public payment status endpoint, keyed by the order's unguessable publicToken.
 * The browser payment page polls this to update the status in real time.
 *
 * No secrets are exposed: only status, delivery flag and expiry are returned.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Throttle abusive polling/enumeration per IP. The page polls every few
  // seconds, so 60/min per IP is comfortably above legitimate usage.
  const limit = rateLimit(`paystatus:${clientIpFrom(req)}`, {
    max: 60,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
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
