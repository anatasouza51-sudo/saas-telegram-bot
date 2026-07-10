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
  | "system"

export async function logActivity(params: {
  action: string
  category: LogCategory
  actorId?: string | null
  actorName?: string | null
  details?: string | null
}) {
  try {
    await db.insert(activityLogs).values({
      action: params.action,
      category: params.category,
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      details: params.details ?? null,
    })
  } catch (err) {
    // Never let logging break the main flow
    console.log("[v0] logActivity error:", (err as Error).message)
  }
}
