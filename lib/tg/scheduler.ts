import "server-only"
import { db } from "@/lib/db"
import { telegramSchedules, telegramPosts } from "@/lib/db/schema"
import { and, eq, lte, isNotNull } from "drizzle-orm"
import { enqueuePost, type TargetSpec } from "@/lib/tg/queue"
import { nextRun, parseRecurrence } from "@/lib/tg/recurrence"

/**
 * Finds schedules whose nextRunAt is due, enqueues the associated post to its
 * targets, then advances (recurring) or deactivates (one-shot) the schedule.
 * Returns how many schedules fired and how many errored.
 *
 * Each schedule is isolated: a failure on one never prevents the others from
 * firing, and the failures are reported to the caller instead of thrown away.
 */
export async function processSchedules(): Promise<{
  fired: number
  failed: number
}> {
  const now = new Date()
  const due = await loadDue(now)

  let fired = 0
  let failed = 0
  for (const s of due) {
    try {
      const didFire = await runSchedule(s, now)
      if (didFire) fired++
    } catch (err) {
      failed++
      console.error(`[tg/scheduler] schedule ${s.id} failed:`, err)
    }
  }

  return { fired, failed }
}

type DueSchedule = Awaited<ReturnType<typeof loadDue>>[number]

async function loadDue(now: Date) {
  return db
    .select()
    .from(telegramSchedules)
    .where(
      and(
        eq(telegramSchedules.active, true),
        isNotNull(telegramSchedules.nextRunAt),
        lte(telegramSchedules.nextRunAt, now),
      ),
    )
    .for("update", { skipLocked: true })
}

// Fires a single schedule. Returns whether a post was actually enqueued.
async function runSchedule(s: DueSchedule, now: Date): Promise<boolean> {
  const targets = parseTargets(s.targets)

  // Resolve targets fresh each time (admin status may have changed)
  if (targets.length === 0) {
    // Mark as skipped by setting lastRunAt and advancing nextRunAt
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
    return false
  }

  await enqueuePost({
    storeId: s.ownerId,
    postId: s.postId,
    targets,
    scheduleId: s.id,
    scheduledFor: now,
  })

  // Set post status to scheduled (not queued) since this is an automated dispatch
  await db
    .update(telegramPosts)
    .set({ status: "scheduled", updatedAt: new Date() })
    .where(eq(telegramPosts.id, s.postId))

  const rec = parseRecurrence(s.recurrence)
  const upcoming = s.scheduleType === "recurring" ? nextRun(rec, now) : null

  if (upcoming) {
    // For recurring: advance nextRunAt to the next occurrence
    // If nextRunAt is in the past (we missed some), skip to the next valid one
    let nextDate = upcoming
    while (nextDate <= now) {
      const rec2 = parseRecurrence(s.recurrence)
      const next2 = nextRun(rec2, nextDate)
      if (!next2) {
        nextDate = now
        break
      }
      nextDate = next2
    }
    await db
      .update(telegramSchedules)
      .set({ lastRunAt: now, nextRunAt: nextDate })
      .where(eq(telegramSchedules.id, s.id))
  } else {
    // One-shot: deactivate after firing
    await db
      .update(telegramSchedules)
      .set({ lastRunAt: now, nextRunAt: null, active: false })
      .where(eq(telegramSchedules.id, s.id))
  }

  return true
}

// A malformed target list disables the schedule's dispatch rather than
// crashing the run; it is logged so the cause is visible.
function parseTargets(raw: string): TargetSpec {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as TargetSpec) : []
  } catch (err) {
    console.error("[tg/scheduler] malformed targets:", raw, err)
    return []
  }
}
