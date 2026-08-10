/**
 * Teste mínimo de isolamento de sessão A/B sobre lib/session.ts
 *
 * Mocka auth.api.getSession para retornar usuários distintos por cookie de
 * sessão. Roda chamadas CONSECUTIVAS e CONCORRENTES de getSessionUser e
 * comprova que o ownerId/storeId da Conta A nunca é servido à Conta B.
 *
 * Execução: pnpm exec vitest run tests/session-isolation.test.ts
 * (vitest não é dep do projeto; fallback abaixo usa esbuild/ts-node? Não —
 *  este arquivo roda via vitest instalado apenas no sandbox para o teste.)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// --- Estado compartilhado dos mocks ---
// IMPORTANTE: os factories de vi.mock são HOISTADOS para o topo do arquivo,
// portanto usamos `var` aqui para que as variáveis existam no momento do
// hoisting (com `let`/`const` ocorre ReferenceError por TDZ).
var currentCookieJar: Array<{ name: string; value: string }> = []
var defaultCookiesFn: ReturnType<typeof vi.fn> | undefined = undefined

// --- Mocks do Next.js antes de importar o módulo sob teste ---
vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  // Estado controlável do teste: "cookies atuais" da requisição
  defaultCookiesFn = vi.fn(async () => {
    // Captura o jar no MOMENTO da invocação, simulando o context de cada
    // requisição (como o Next.js faz por request). Com o cache() antigo,
    // a invocação era reutilizada e a captura nunca reocorria.
    const jarAtCall = currentCookieJar
    return { getAll: () => jarAtCall }
  })
  return {
    ...mod,
    cookies: defaultCookiesFn,
  }
})

vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect mocked — não deveria ocorrer neste teste")
  },
}))

// Mock do Better Auth: resolve a identidade pelo valor do cookie de sessão
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async ({ headers }: { headers: Headers }) => {
        const cookieHeader = headers.get("cookie") ?? ""
        const tokenMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/)
        const token = tokenMatch?.[1]
        if (!token) return null
        const identity = tokenMap.get(token)
        if (!identity) return null
        return {
          user: {
            id: identity.id,
            name: identity.name,
            email: identity.email,
            role: "admin",
            ownerId: identity.ownerId,
            image: null,
            onboardingSeen: false,
          },
        }
      }),
    },
  },
}))

// Mock do banco: não deve ser tocado para decidir a identidade
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    }),
  },
}))

vi.mock("server-only", () => ({}))

// --- Dados simulados das duas contas ---
const ACCOUNT_A = { id: "user-A", name: "Alice", email: "alice@example.com", ownerId: "owner-A" }
const ACCOUNT_B = { id: "user-B", name: "Bob", email: "bob@example.com", ownerId: "owner-B" }
const COOKIE_A = "session-token-AAA"
const COOKIE_B = "session-token-BBB"
const tokenMap = new Map<string, typeof ACCOUNT_A>([
  [COOKIE_A, ACCOUNT_A],
  [COOKIE_B, ACCOUNT_B],
])

// --- Importar o módulo sob teste APÓS os mocks ---
import { getSessionUser } from "@/lib/session"

beforeEach(() => {
  vi.clearAllMocks()
  currentCookieJar = []
})
afterEach(() => {
  vi.restoreAllMocks()
})

function setSession(cookieValue: string) {
  currentCookieJar = [{ name: "better-auth.session_token", value: cookieValue }]
}

describe("Isolamento de sessão A/B em getSessionUser", () => {
  it("Conta A retorna somente dados da A", async () => {
    setSession(COOKIE_A)
    const u = await getSessionUser()
    expect(u?.id).toBe("user-A")
    expect(u?.ownerId).toBe("owner-A")
    expect(u?.storeId).toBe("owner-A")
    expect(u?.email).toBe("alice@example.com")
  })

  it("Conta B retorna somente dados da B", async () => {
    setSession(COOKIE_B)
    const u = await getSessionUser()
    expect(u?.id).toBe("user-B")
    expect(u?.ownerId).toBe("owner-B")
    expect(u?.storeId).toBe("owner-B")
    expect(u?.email).toBe("bob@example.com")
  })

  it("Requisições CONSECUTIVAS A/B: nenhuma reutilização de sessão", async () => {
    const results: Array<{ id: string | null; ownerId: string | null }> = []

    setSession(COOKIE_A)
    const a1 = await getSessionUser()
    results.push({ id: a1?.id ?? null, ownerId: a1?.ownerId })

    setSession(COOKIE_B)
    const b1 = await getSessionUser()
    results.push({ id: b1?.id ?? null, ownerId: b1?.ownerId })

    setSession(COOKIE_A)
    const a2 = await getSessionUser()
    results.push({ id: a2?.id ?? null, ownerId: a2?.ownerId })

    setSession(COOKIE_B)
    const b2 = await getSessionUser()
    results.push({ id: b2?.id ?? null, ownerId: b2?.ownerId })

    expect(results[0].id).toBe("user-A")
    expect(results[1].id).toBe("user-B")
    expect(results[2].id).toBe("user-A")
    expect(results[3].id).toBe("user-B")
    // Cada resultado bate com sua conta; nenhum ownerId vazou
    for (const r of results) {
      expect(r.ownerId).toBe(r.id === "user-A" ? "owner-A" : "owner-B")
    }
  })

  it("Requisições SIMULTÂNEAS A/B: concorrência não mistura sessões", async () => {
    // Simula contexts de requisição distintos em paralelo: cada "requisição"
    // usa um cookie de sessão próprio, alternado A/B sem sincronização.
    const calls: Array<Promise<{ id: string | null; ownerId: string | null }>> = []
    for (let i = 0; i < 100; i++) {
      calls.push(
        new Promise<{ id: string | null; ownerId: string | null }>((resolve) => {
          // Troca síncrona do "contexto de cookies" no início da requisição
          setSession(i % 2 === 0 ? COOKIE_A : COOKIE_B)
          void getSessionUser().then((u) =>
            resolve({ id: u?.id ?? null, ownerId: u?.ownerId })
          )
          // Troca imediata do contexto logo depois de iniciar a chamada
          setSession(i % 2 === 0 ? COOKIE_B : COOKIE_A)
        })
      )
    }
    const results = await Promise.all(calls)
    for (let i = 0; i < results.length; i++) {
      const expectedId = i % 2 === 0 ? "user-A" : "user-B"
      expect(results[i].id, `chamada ${i} retornou sessão errada`).toBe(expectedId)
      expect(results[i].ownerId).toBe(expectedId === "user-A" ? "owner-A" : "owner-B")
    }
  })

  it("Compartilhamento simulado do cache antigo retorna sessão errada (prova do bug)", async () => {
    // Este teste demonstra o mecanismo do bug: quando o resultado de
    // getSessionUser é MEMOIZADO (como no cache() antigo, sem chave de
    // sessão), chamadas de contas diferentes reutilizam a mesma promise
    // e a mesma identidade. Recriamos a memoização em cima da função
    // corrigida, provando que a memoização sem chave de sessão serve a
    // sessão da Conta A para a Conta B.
    let pinnedJar: Array<{ name: string; value: string }> = []
    const pinnedCookies = vi.fn(async () => ({ getAll: () => pinnedJar }))
    const nh = await import("next/headers")
    ;(nh.cookies as ReturnType<typeof vi.fn>).mockImplementation(pinnedCookies as never)

    // Memoização equivalente ao cache() sem chave de sessão
    let memoizedPromise: ReturnType<typeof getSessionUser> | undefined
    const memoizedGetSessionUser = () =>
      memoizedPromise ?? (memoizedPromise = getSessionUser())

    pinnedJar = [{ name: "better-auth.session_token", value: COOKIE_A }]
    const a = await memoizedGetSessionUser()
    expect(a?.id).toBe("user-A")

    // Troca de contexto (Conta B) — a função memoizada ainda retorna A
    pinnedJar = [{ name: "better-auth.session_token", value: COOKIE_B }]
    const b = await memoizedGetSessionUser()
    expect(
      b?.id,
      "Bug reproduzido: sessão da Conta A servida à Conta B"
    ).toBe("user-A")

    // Restaurar o mock padrão de cookies para os testes seguintes
    const nh2 = await import("next/headers")
    ;(nh2.cookies as ReturnType<typeof vi.fn>).mockImplementation(
      vi.fn(async () => {
        const jarAtCall = currentCookieJar
        return { getAll: () => jarAtCall }
      }) as never
    )
  })

  it("Sem cookie, retorna null (não reusa sessão anterior)", async () => {
    setSession(COOKIE_A)
    const a = await getSessionUser()
    expect(a?.id).toBe("user-A")

    currentCookieJar = [] // requisição sem sessão (anonima)
    const none = await getSessionUser()
    expect(none).toBeNull()
  })
})
