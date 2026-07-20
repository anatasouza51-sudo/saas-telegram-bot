"use server"

import { requireUser } from "@/lib/session"
import { getLogs } from "@/lib/queries/records"

export async function getRecentLogs(limit: number = 20) {
  try {
    const user = await requireUser()
    const logs = await getLogs(user.storeId, limit)
    return logs
  } catch (error) {
    console.error("Erro ao buscar logs:", error)
    return []
  }
}
