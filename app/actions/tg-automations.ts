"use server"

import { db } from "@/lib/db"
import { telegramAutomations } from "@/lib/db/schema"
import { requireCapability } from "@/lib/session"
import { logActivity } from "@/lib/log"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import {
  validateAutomationName,
  validateAutomationCustomText,
  validateTargets,
  validateSerializedJson,
} from "@/lib/validation"

export type AutomationInput = {
  name: string
  trigger: string
  templateId?: number | null
  customText?: string
  targets: string[]
  active?: boolean
}

const VALID_TRIGGERS = [
  "product_created",
  "stock_restocked",
  "product_unavailable",
  "promo_created",
]

export async function listAutomations() {
  const { storeId } = await requireCapability("posts.manage")
  return db
    .select()
    .from(telegramAutomations)
    .where(eq(telegramAutomations.ownerId, storeId))
    .orderBy(desc(telegramAutomations.createdAt))
}

export async function saveAutomation(input: AutomationInput, id?: number) {
  const user = await requireCapability("posts.manage")
  const name = validateAutomationName(input.name)
  if (!VALID_TRIGGERS.includes(input.trigger)) {
    throw new Error("Gatilho inválido")
  }
  const targets = validateTargets(input.targets)
  if (targets.length === 0) {
    throw new Error("Selecione ao menos um destino")
  }
  const customText = validateAutomationCustomText(input.customText)
  if (!input.templateId && !customText) {
    throw new Error("Informe um texto ou selecione um template")
  }

  const values = {
    ownerId: user.storeId,
    name,
    trigger: input.trigger,
    templateId: input.templateId ?? null,
    customText,
    targets: validateSerializedJson(targets, "Destinos"),
    active: input.active ?? true,
  }

  if (id) {
    await db
      .update(telegramAutomations)
      .set(values)
      .where(
        and(
          eq(telegramAutomations.id, id),
          eq(telegramAutomations.ownerId, user.storeId),
        ),
      )
  } else {
    await db.insert(telegramAutomations).values(values)
  }
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `${id ? "Atualizou" : "Criou"} a automação "${input.name}"`,
    category: "posts",
  })
  revalidatePath("/automations")
}

export async function toggleAutomation(id: number, active: boolean) {
  const user = await requireCapability("posts.manage")
  await db
    .update(telegramAutomations)
    .set({ active })
    .where(
      and(
        eq(telegramAutomations.id, id),
        eq(telegramAutomations.ownerId, user.storeId),
      ),
    )
  revalidatePath("/automations")
}

export async function deleteAutomation(id: number) {
  const user = await requireCapability("posts.manage")
  await db
    .delete(telegramAutomations)
    .where(
      and(
        eq(telegramAutomations.id, id),
        eq(telegramAutomations.ownerId, user.storeId),
      ),
    )
  await logActivity({
    storeId: user.storeId,
    actor: user,
    action: `Excluiu a automação #${id}`,
    category: "posts",
  })
  revalidatePath("/automations")
}
