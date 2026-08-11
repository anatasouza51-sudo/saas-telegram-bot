import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

function helperSource() {
  return source("lib/db/tenant-tx.ts")
}

test.describe("Parte 4A — contexto transacional de tenant", () => {
  test("emite SET LOCAL com o storeId recebido antes do callback", () => {
    const text = helperSource()
    const transaction = text.indexOf("return db.transaction(async (tx) => {")
    const transactionBody = text.slice(transaction)
    const setLocal = transactionBody.indexOf("await setTenantLocal(tx, storeId)")
    const callback = transactionBody.indexOf("return callback(tx)")

    expect(transaction).toBeGreaterThanOrEqual(0)
    expect(setLocal).toBeGreaterThanOrEqual(0)
    expect(callback).toBeGreaterThan(setLocal)
    expect(text).toContain(
      "sql`SELECT set_config('app.current_tenant', ${storeId}, true)`",
    )
    expect(text).not.toContain("sql.raw")
    expect(text).not.toContain("quoteSqlString")
    expect(text).not.toContain("replaceAll")
  })

  test("mantém o contexto dentro do boundary transacional e propaga falhas para rollback", () => {
    const text = helperSource()
    const transactionBody = text.slice(
      text.indexOf("return db.transaction(async (tx) => {"),
    )

    expect(transactionBody).toContain("await setTenantLocal(tx, storeId)")
    expect(transactionBody).toContain("return callback(tx)")
    expect(transactionBody).not.toContain("catch (")
    expect(transactionBody).not.toContain("return callback(tx).catch")
  })

  test("não mantém tenant em estado global e prepara cada chamada de forma independente", () => {
    const text = helperSource()

    expect(text).not.toContain("globalThis")
    expect(text).not.toMatch(/(?:let|const|var)\s+currentTenant/)
    expect(text.match(/set_config\('app\.current_tenant'/g)).toHaveLength(1)
    expect(text).toContain("await setTenantLocal(tx, storeId)")
    expect(text).toContain("db.transaction(async (tx)")
    expect(text).toContain("withTenantTx<T>")
  })

  test("passa valores especiais como parâmetro, nunca como fragmento SQL", () => {
    const text = helperSource()
    const storeIds = [
      "store-123",
      "store'123",
      "store\\123",
      "store\\'123",
      "loja-ação-测试",
      "store\\'; RESET ALL; --",
    ]

    expect(text).toContain(
      "sql`SELECT set_config('app.current_tenant', ${storeId}, true)`",
    )
    expect(text).not.toMatch(/sql\.raw|quoteSqlString|replaceAll/)
    expect(text).toContain("storeId: string")
    expect(storeIds).toEqual([
      "store-123",
      "store'123",
      "store\\123",
      "store\\'123",
      "loja-ação-测试",
      "store\\'; RESET ALL; --",
    ])
  })

  test("rejeita storeId vazio, nulo, com espaços nas extremidades ou inválido", () => {
    const text = helperSource()
    const validator = text.slice(
      text.indexOf("function assertTenantId"),
      text.indexOf("/**", text.indexOf("function assertTenantId") + 1),
    )

    expect(validator).toContain('typeof storeId !== "string"')
    expect(validator).toContain("storeId.length === 0")
    expect(validator).toContain("storeId.trim() !== storeId")
    expect(validator).toContain("storeId.includes(\"\\u0000\")")
    expect(text).toContain("assertTenantId(storeId)")
  })

  test("integra fluxos autenticados, administrativos e workers com tenant explícito", () => {
    expect(source("app/actions/tg-posts.ts")).toContain(
      "withTenantTx(\n      user.storeId,",
    )
    expect(source("app/actions/admins.ts")).toContain(
      "withTenantTx(actor.storeId, async (tx)",
    )
    expect(source("lib/tg/scheduler.ts")).toContain(
      "withTenantTx(s.ownerId, async (tx)",
    )
    expect(source("lib/tg/queue.ts")).toContain(
      "withTenantTx(item.ownerId, async (tx)",
    )
  })

  test("mantém a claim da fila na mesma transação que FOR UPDATE SKIP LOCKED", () => {
    const text = source("lib/tg/queue.ts")
    const transactionStart = text.indexOf("return db.transaction(async (tx) => {")
    const transactionEnd = text.indexOf("\n  })", transactionStart)
    const transactionBody = text.slice(transactionStart, transactionEnd)
    const lock = transactionBody.indexOf('.for("update", { skipLocked: true })')
    const claim = transactionBody.indexOf('.update(telegramQueue)')

    expect(transactionStart).toBeGreaterThanOrEqual(0)
    expect(lock).toBeGreaterThanOrEqual(0)
    expect(claim).toBeGreaterThan(lock)
    expect(transactionBody).toContain("setTenantLocal(tx, item.ownerId)")
    expect(transactionBody).toContain('eq(telegramQueue.status, "pending")')
  })

  test("mantém a claim do scheduler na mesma transação e deriva tenant da linha selecionada", () => {
    const text = source("lib/tg/scheduler.ts")
    const transactionStart = text.indexOf("return db.transaction(async (tx) => {")
    const transactionEnd = text.indexOf("\n  })", transactionStart)
    const transactionBody = text.slice(transactionStart, transactionEnd)
    const lock = transactionBody.indexOf('.for("update", { skipLocked: true })')
    const claim = transactionBody.indexOf('.update(telegramSchedules)')

    expect(transactionStart).toBeGreaterThanOrEqual(0)
    expect(lock).toBeGreaterThanOrEqual(0)
    expect(claim).toBeGreaterThan(lock)
    expect(transactionBody).toContain("setTenantLocal(tx, schedule.ownerId)")
    expect(transactionBody).toContain("eq(telegramSchedules.ownerId, schedule.ownerId)")
  })

  test("não deixa operações críticas de publishNow no db global", () => {
    const text = source("app/actions/tg-posts.ts")
    const start = text.indexOf("export async function publishNow")
    const end = text.indexOf("// Schedules a post for later", start)
    const publishNow = text.slice(start, end)

    expect(publishNow).not.toMatch(/\bdb\./)
    expect(publishNow).toContain("savePostForUser(input, user, false, tx)")
    expect(publishNow).toMatch(/tx\s*\.select\(\)/)
    expect(publishNow).toContain("}, tx)")
  })
})
