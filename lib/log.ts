import "server-only"
import { db } from "@/lib/db"
import { activityLogs } from "@/lib/db/schema"

type LogCategory =
  | "auth"
  | "product"
  | "stock"
  | "order"
  | "payment"
  | "delivery"
  | "customer"
  | "admin"
  | "settings"
  | "security"
  | "posts"
  | "system"

export async function logActivity(params: {
  storeId: string
  action: string
  category: LogCategory
  actor?: { id: string; name: string } | null
  actorId?: string | null
  actorName?: string | null
  details?: string | null
}) {
  try {
    await db.insert(activityLogs).values({
      ownerId: params.storeId,
      action: params.action,
      category: params.category,
      actorId: params.actor?.id ?? params.actorId ?? null,
      actorName: params.actor?.name ?? params.actorName ?? null,
      details: params.details ?? null,
    })
  } catch (err) {
    // Never let logging break the main flow
    console.log("[v0] logActivity error:", (err as Error).message)
  }
}
