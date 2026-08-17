import "server-only"
import { db } from "@/lib/db"
import type { TenantDb } from "@/lib/db/tenant-tx"
import { activityLogs } from "@/lib/db/schema"

function safeLogText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, maxLength)
}

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
},
  dctx: TenantDb = db,
) {
  try {
    await dctx.insert(activityLogs).values({
      ownerId: params.storeId,
      action: safeLogText(params.action, 160) ?? "atividade",
      category: params.category,
      actorId: safeLogText(params.actor?.id ?? params.actorId, 128),
      actorName: safeLogText(params.actor?.name ?? params.actorName, 160),
      details: safeLogText(params.details, 1000),
    })
  } catch {
    // Never let logging break the main flow. Do not print the attempted log
    // payload or database error because it may contain user-controlled data.
    console.error("[log] could not persist activity")
  }
}
