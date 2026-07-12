import "server-only"
import { db } from "@/lib/db"
import { telegramSchedules } from "@/lib/db/schema"
import { and, eq, lte, isNotNull } from "drizzle-orm"
import { enqueuePost, type TargetSpec } from "@/lib/tg/queue"
import { nextRun, parseRecurrence } from "@/lib/tg/recurrence"

/**
 * Finds schedules whose nextRunAt is due, enqueues the associated post to its
 * targets, then advances (recurring) or deactivates (one-shot) the schedule.
 * Returns how many schedules fired.
 */
export async function processSchedules(): Promise<{ fired: number }> {
  const now = new Date()
  const due = await db
    .select()
    .from(telegramSchedules)
    .where(
      and(
        eq(telegramSchedules.active, true),
        isNotNull(telegramSchedules.nextRunAt),
        lte(telegramSchedules.nextRunAt, now),
      ),
    )

  let fired = 0
  for (const s of due) {
    let targets: TargetSpec = []
    try {
      targets = JSON.parse(s.targets)
    } catch {
      targets = []
    }

    await enqueuePost({
      storeId: s.ownerId,
      postId: s.postId,
      targets,
      scheduleId: s.id,
      scheduledFor: now,
    })
    fired++

    const rec = parseRecurrence(s.recurrence)
    const upcoming = s.scheduleType === "recurring" ? nextRun(rec, now) : null

    if (upcoming) {
      await db
        .update(telegramSchedules)
        .set({ lastRunAt: now, nextRunAt: upcoming })
        .where(eq(telegramSchedules.id, s.id))
    } else {
      await db
        .update(telegramSchedules)
        .set({ lastRunAt: now, nextRunAt: null, active: false })
        .where(eq(telegramSchedules.id, s.id))
    }
  }

  return { fired }
}
