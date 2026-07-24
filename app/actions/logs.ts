"use server"

import { requireUser } from "@/lib/session"
import { getLogs } from "@/lib/queries/records"

// Throws on failure so the caller can distinguish "no logs yet" from "the log
// query broke". `requireUser` stays outside any try: it redirects by throwing.
export async function getRecentLogs(limit: number = 20) {
  const user = await requireUser()
  return getLogs(user.storeId, limit)
}
