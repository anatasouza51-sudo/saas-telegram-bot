import "server-only"
import { db } from "@/lib/db"
import {
  telegramAutomations,
  telegramTemplates,
  telegramPosts,
} from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { enqueuePost, type TargetSpec } from "@/lib/tg/queue"
import { notifyManagement } from "@/lib/tg/management"
import { logActivity } from "@/lib/log"

export type AutomationTrigger =
  | "product_created"
  | "stock_restocked"
  | "product_unavailable"
  | "promo_created"

export type AutomationContext = {
  productName?: string
  price?: string | number
  category?: string
  stock?: number
  extra?: Record<string, string>
}

const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  product_created: "Novo produto",
  stock_restocked: "Estoque reposto",
  product_unavailable: "Produto indisponível",
  promo_created: "Promoção criada",
}

// Replaces {product}, {price}, {category}, {stock} and any extra tokens.
function applyVariables(text: string, ctx: AutomationContext): string {
  const map: Record<string, string> = {
    product: ctx.productName ?? "",
    price:
      ctx.price != null
        ? typeof ctx.price === "number"
          ? ctx.price.toFixed(2)
          : ctx.price
        : "",
    category: ctx.category ?? "",
    stock: ctx.stock != null ? String(ctx.stock) : "",
    ...(ctx.extra ?? {}),
  }
  return text.replace(/\{(\w+)\}/g, (full, key: string) =>
    key in map ? map[key] : full,
  )
}

/**
 * Fires all active automations for a trigger. Designed to never throw into the
 * caller (product/stock flows) — failures are logged and mirrored to the
 * management group instead. Returns the number of automations fired.
 */
export async function runAutomations(
  storeId: string,
  trigger: AutomationTrigger,
  ctx: AutomationContext = {},
): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(telegramAutomations)
      .where(
        and(
          eq(telegramAutomations.ownerId, storeId),
          eq(telegramAutomations.trigger, trigger),
          eq(telegramAutomations.active, true),
        ),
      )
    if (rows.length === 0) return 0

    let fired = 0
    for (const auto of rows) {
      try {
        // Resolve text + media + buttons from the linked template or custom text.
        let text = auto.customText ?? ""
        let parseMode: "HTML" | "Markdown" = "HTML"
        let mediaIds: string | null = null
        let buttons: string | null = null

        if (auto.templateId) {
          const [tpl] = await db
            .select()
            .from(telegramTemplates)
            .where(
              and(
                eq(telegramTemplates.id, auto.templateId),
                eq(telegramTemplates.ownerId, storeId),
              ),
            )
          if (tpl) {
            text = tpl.text ?? text
            parseMode = (tpl.parseMode as "HTML" | "Markdown") ?? "HTML"
            mediaIds = tpl.mediaIds
            buttons = tpl.buttons
          }
        }

        text = applyVariables(text, ctx)
        if (!text && !mediaIds) continue

        // Materialize a post record (auditable in history) then enqueue it.
        const [post] = await db
          .insert(telegramPosts)
          .values({
            ownerId: storeId,
            title: `[Auto] ${auto.name}`,
            text,
            parseMode,
            mediaIds,
            buttons,
            status: "queued",
            createdByName: "Automação",
          })
          .returning()

        let targets: TargetSpec = []
        try {
          targets = JSON.parse(auto.targets)
        } catch {
          targets = []
        }
        const enqueued = await enqueuePost({
          storeId,
          postId: post.id,
          targets,
        })

        await db
          .update(telegramAutomations)
          .set({ lastTriggeredAt: new Date() })
          .where(eq(telegramAutomations.id, auto.id))

        fired++
        await logActivity({
          storeId,
          action: `Automação "${auto.name}" disparada (${TRIGGER_LABEL[trigger]}) para ${enqueued} destino(s)`,
          category: "posts",
        })
      } catch (err) {
        await notifyManagement(
          storeId,
          "error",
          "Falha em automação",
          [
            `Automação: ${auto.name}`,
            `Gatilho: ${TRIGGER_LABEL[trigger]}`,
            `Erro: ${err instanceof Error ? err.message : "desconhecido"}`,
          ].join("\n"),
        )
      }
    }
    return fired
  } catch {
    // Swallow: automations must never break the core product/stock flow.
    return 0
  }
}
