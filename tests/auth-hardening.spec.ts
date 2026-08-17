import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

test.describe("Hardening de autenticação e autorização", () => {
  test("novos usuários não recebem admin por padrão em nenhum bootstrap", () => {
    const auth = source("lib/auth.ts")
    const migrate = source("lib/db/migrate.ts")
    const repair = source("app/api/repair-db/route.ts")

    expect(auth).toContain('defaultValue: "support"')
    expect(auth).toContain('role: "support"')
    expect(migrate).toContain("role TEXT NOT NULL DEFAULT 'support'")
    expect(migrate).toContain("COALESCE(role, 'support')")
    expect(repair).toContain("SET DEFAULT 'support'")
    expect(repair).toContain("Adicionado DEFAULT 'support'")

    expect(auth).not.toContain('defaultValue: "admin"')
    expect(auth).not.toContain('role: "admin"')
    expect(migrate).not.toContain("DEFAULT 'admin'")
    expect(migrate).not.toContain("COALESCE(role, 'admin')")
    expect(repair).not.toContain("SET DEFAULT 'admin'")
  })

  test("sessão deriva autorização do registro atual do banco", () => {
    const session = source("lib/session.ts")

    expect(session).toContain("role: userTable.role")
    expect(session).toContain("ownerId: userTable.ownerId")
    expect(session).toContain("if (!dbUser) return null")
    expect(session).toContain("DB query failed; denying session")
    expect(session).not.toContain("using session data as fallback")
    expect(session).not.toContain("const ownerId = u.ownerId ?? null")
    expect(session).not.toContain("role: (u.role as Role) ||")
  })
})
