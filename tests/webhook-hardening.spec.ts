import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

test.describe("Hardening de webhook", () => {
  test("replay depende de claim atômico e falha fechado sem Redis", () => {
    const route = source("app/api/telegram/webhook/[storeId]/route.ts")
    expect(route).toContain('type ReplayClaim = "new" | "replay" | "unavailable"')
    expect(route).toContain("NX=true&EX=86400")
    expect(route).toContain('return NextResponse.json({ error: "Temporarily unavailable" }, { status: 503 })')
    expect(route).not.toContain("markProcessed(storeId, update.update_id).catch")
    expect(route).not.toContain("ensureDbStructure")
  })

  test("segredos de webhook exigem cifra e não fazem bootstrap durante request", () => {
    const secrets = source("lib/webhook-secrets.ts")
    expect(secrets).toContain("Webhook secret is not encrypted")
    expect(secrets).toContain("apply database migrations before serving traffic")
    expect(secrets).not.toContain("ensureDbStructure()")
  })
})
