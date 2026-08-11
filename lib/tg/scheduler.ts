import "server-only"
import { db } from "@/lib/db"
import { setTenantLocal, withTenantTx } from "@/lib/db/tenant-tx"
import { telegramSchedules, telegramPosts } from "@/lib/db/schema"
import { and, eq, lte, isNotNull } from "drizzle-orm"
import { enqueuePost, type TargetSpec } from "@/lib/tg/queue"
import { nextRun, parseRecurrence } from "@/lib/tg/recurrence"

const SCHEDULE_CLAIM_HOLD_MS = 10 * 60_000

type DueSchedule = typeof telegramSchedules.$inferSelect & {
  claimNextRunAt: Date
}

/**
 * Finds schedules whose nextRunAt is due, claims them atomically, enqueues the
 * associated post to its targets, then advances (recurring) or deactivates
 * (one-shot) the schedule. Returns how many schedules fired and errored.
 *
 * Each schedule is isolated: a failure on one never prevents the others from
 * firing, and a failed claim is released for retry. The Telegram API is not
 * called here; queue delivery happens in the queue worker.
 */
export async function processSchedules(): Promise<{
  fired: number
  failed: number
}> {
  const now = new Date()
  const due = await claimDue(now)

  let fired = 0
  let failed = 0
  for (const s of due) {
    try {
      const didFire = await runSchedule(s, now)
      if (didFire) fired++
    } catch (err) {
      failed++
      console.error(`[tg/scheduler] schedule ${s.id} failed:`, err)
      try {
        await releaseScheduleClaim(s)
      } catch (releaseErr) {
        console.error(`[tg/scheduler] schedule ${s.id} claim release failed:`, releaseErr)
      }
    }
  }

  return { fired, failed }
}

/**
 * Discovers schedules globally because a worker has no authenticated session,
 * then keeps FOR UPDATE and the reservation update in one transaction. The
 * ownerId always comes from the selected row before SET LOCAL is applied.
 *
 * nextRunAt is used as the existing reservation marker: a claimed schedule
 * remains active but is moved temporarily beyond the current due window. This
 * avoids overloading active=false, which is also the user-facing cancellation
 * state, and lets a crashed worker become eligible again after the hold.
 */
async function claimDue(now: Date): Promise<DueSchedule[]> {
  return db.transaction(async (tx) => {
    const candidates = await tx
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

    const claimed: DueSchedule[] = []
    const claimNextRunAt = new Date(now.getTime() + SCHEDULE_CLAIM_HOLD_MS)

    for (const schedule of candidates) {
      const originalNextRunAt = schedule.nextRunAt
      if (!originalNextRunAt) continue

      await setTenantLocal(tx, schedule.ownerId)
      const [claimedRow] = await tx
        .update(telegramSchedules)
        .set({ nextRunAt: claimNextRunAt })
        .where(
          and(
            eq(telegramSchedules.id, schedule.id),
            eq(telegramSchedules.ownerId, schedule.ownerId),
            eq(telegramSchedules.active, true),
            eq(telegramSchedules.nextRunAt, originalNextRunAt),
          ),
        )
        .returning()

      if (claimedRow) {
        claimed.push({ ...schedule, claimNextRunAt })
      }
    }

    return claimed
  })
}

async function releaseScheduleClaim(schedule: DueSchedule) {
  await withTenantTx(schedule.ownerId, async (tx) => {
    await tx
      .update(telegramSchedules)
      .set({ active: true, nextRunAt: schedule.nextRunAt })
      .where(
        and(
          eq(telegramSchedules.id, schedule.id),
          eq(telegramSchedules.ownerId, schedule.ownerId),
          eq(telegramSchedules.active, true),
          eq(telegramSchedules.nextRunAt, schedule.claimNextRunAt),
        ),
      )
  })
}

// Fires a single claimed schedule. Returns whether a post was actually enqueued.
async function runSchedule(s: DueSchedule, now: Date): Promise<boolean> {
  return withTenantTx(s.ownerId, async (tx) => {
    // Lock and re-check the reservation before using the in-memory snapshot.
    // A cancellation or edit that committed first wins and skips this claim.
    const [claimed] = await tx
      .select()
      .from(telegramSchedules)
      .where(
        and(
          eq(telegramSchedules.id, s.id),
          eq(telegramSchedules.ownerId, s.ownerId),
          eq(telegramSchedules.active, true),
          eq(telegramSchedules.nextRunAt, s.claimNextRunAt),
        ),
      )
      .for("update")
      .limit(1)

    if (!claimed) return false

    const claimWhere = and(
      eq(telegramSchedules.id, s.id),
      eq(telegramSchedules.ownerId, s.ownerId),
      eq(telegramSchedules.active, true),
      eq(telegramSchedules.nextRunAt, s.claimNextRunAt),
    )
    const targets = parseTargets(claimed.targets)

    // Resolve targets fresh each time (admin status may have changed).
    if (targets.length === 0) {
      const rec = parseRecurrence(claimed.recurrence)
      const upcoming = claimed.scheduleType === "recurring" ? nextRun(rec, now) : null
      if (upcoming) {
        await tx
          .update(telegramSchedules)
          .set({ active: true, lastRunAt: now, nextRunAt: upcoming })
          .where(claimWhere)
      } else {
        await tx
          .update(telegramSchedules)
          .set({ lastRunAt: now, nextRunAt: null, active: false })
          .where(claimWhere)
      }
      return false
    }

    await enqueuePost(
      {
        storeId: s.ownerId,
        postId: claimed.postId,
        targets,
        scheduleId: claimed.id,
        scheduledFor: now,
      },
      tx,
    )

    // Set post status to scheduled (not queued) since this is an automated dispatch.
    await tx
      .update(telegramPosts)
      .set({ status: "scheduled", updatedAt: new Date() })
      .where(
        and(
          eq(telegramPosts.id, claimed.postId),
          eq(telegramPosts.ownerId, s.ownerId),
        ),
      )

    const rec = parseRecurrence(claimed.recurrence)
    const upcoming = claimed.scheduleType === "recurring" ? nextRun(rec, now) : null

    if (upcoming) {
      // For recurring: advance nextRunAt to the next occurrence. If nextRunAt
      // is in the past (we missed some), skip to the next valid one.
      let nextDate = upcoming
      while (nextDate <= now) {
        const rec2 = parseRecurrence(claimed.recurrence)
        const next2 = nextRun(rec2, nextDate)
        if (!next2) {
          nextDate = now
          break
        }
        nextDate = next2
      }
      await tx
        .update(telegramSchedules)
        .set({ active: true, lastRunAt: now, nextRunAt: nextDate })
        .where(claimWhere)
    } else {
      // One-shot: deactivate after firing.
      await tx
        .update(telegramSchedules)
        .set({ lastRunAt: now, nextRunAt: null, active: false })
        .where(claimWhere)
    }

    return true
  })
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
