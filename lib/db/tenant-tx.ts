import "server-only"

import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

/**
 * The transaction type exposed by the shared Drizzle database instance.
 * Keeping this alias here lets callers use the same typed transaction without
 * importing Drizzle's internal generic parameters.
 */
export type TenantTx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type TenantDb = TenantTx | typeof db

const MAX_TENANT_ID_LENGTH = 255

function assertTenantId(storeId: string): asserts storeId is string {
  if (typeof storeId !== "string" || storeId.length === 0) {
    throw new Error("storeId do tenant é obrigatório.")
  }
  if (storeId.trim() !== storeId) {
    throw new Error("storeId do tenant não pode conter espaços nas extremidades.")
  }
  if (storeId.length > MAX_TENANT_ID_LENGTH) {
    throw new Error("storeId do tenant excede o tamanho máximo permitido.")
  }
  if (storeId.includes("\u0000")) {
    throw new Error("storeId do tenant contém um caractere inválido.")
  }
}

/**
 * Applies the tenant-local setting to an already-open transaction.
 *
 * PostgreSQL does not accept a bind parameter directly in the value position
 * of SET. `set_config` does: the setting name is a fixed SQL literal and the
 * tenant value is sent as a driver parameter, never as SQL syntax. The third
 * argument keeps the setting local to this transaction.
 *
 * This is used only by worker claim transactions, which must select a row
 * before its trusted ownerId is known. The caller must keep the selection and
 * the claim update in the same transaction boundary.
 */
export async function setTenantLocal(
  tx: TenantTx,
  storeId: string,
): Promise<void> {
  assertTenantId(storeId)
  await tx.execute(
    sql`SELECT set_config('app.current_tenant', ${storeId}, true)`,
  )
}

/**
 * Runs work inside a transaction carrying an explicit tenant-local setting.
 * PostgreSQL clears SET LOCAL automatically on COMMIT and ROLLBACK, while the
 * transaction boundary ensures the setting cannot leak to another request.
 */
export async function withTenantTx<T>(
  storeId: string,
  callback: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  assertTenantId(storeId)
  if (typeof callback !== "function") {
    throw new TypeError("callback transacional é obrigatório.")
  }

  return db.transaction(async (tx) => {
    await setTenantLocal(tx, storeId)
    return callback(tx)
  })
}
