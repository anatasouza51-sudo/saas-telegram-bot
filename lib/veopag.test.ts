import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCharge, mapPaymentStatus } from "@/lib/veopag"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

// Each test uses a fresh client_id so the module-level token cache never
// leaks between cases.
let seq = 0
const credentials = () => ({
  publicKey: `client-${++seq}`,
  secretKey: "secret",
})

const input = {
  amount: 49.9,
  externalId: "order-1",
  description: "Pedido 1",
}

describe("mapPaymentStatus", () => {
  it("maps every approved alias", () => {
    for (const raw of ["paid", "APPROVED", "completed", "Confirmed"]) {
      expect(mapPaymentStatus(raw)).toBe("approved")
    }
  })

  it("maps every refused alias", () => {
    for (const raw of ["refused", "failed", "canceled", "cancelled", "EXPIRED"]) {
      expect(mapPaymentStatus(raw)).toBe("refused")
    }
  })

  it("treats anything unknown as pending", () => {
    expect(mapPaymentStatus("waiting")).toBe("pending")
    expect(mapPaymentStatus("")).toBe("pending")
  })
})

describe("createCharge", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("fails fast when credentials are missing", async () => {
    const res = await createCharge({ publicKey: "", secretKey: "" }, input)
    expect(res).toEqual({
      ok: false,
      error: "Credenciais da VeoPag não configuradas",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("authenticates and returns the PIX code from a 201 response", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ token: "jwt-1" }))
      .mockResolvedValueOnce(
        json({ qrCodeResponse: { transactionId: "tx-1", qrcode: "000201PIX" } }, 201),
      )

    const res = await createCharge(credentials(), {
      ...input,
      payer: { name: "Ana", email: "ana@example.com", document: "99999999999" },
      callbackUrl: "https://app.example.com/webhook",
    })

    expect(res).toEqual({ ok: true, paymentId: "tx-1", pixCode: "000201PIX" })
    const [, depositInit] = fetchMock.mock.calls[1]
    expect(JSON.parse(depositInit.body)).toEqual({
      amount: 49.9,
      external_id: "order-1",
      clientCallbackUrl: "https://app.example.com/webhook",
      payer: { name: "Ana", email: "ana@example.com", document: "99999999999" },
    })
    expect(depositInit.headers.Authorization).toBe("Bearer jwt-1")
  })

  it("defaults the payer fields when the customer data is unknown", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ token: "jwt-2" }))
      .mockResolvedValueOnce(json({ transaction_id: "tx-2", qrcode: "PIX" }))

    const res = await createCharge(credentials(), input)

    expect(res).toEqual({ ok: true, paymentId: "tx-2", pixCode: "PIX" })
    const payer = JSON.parse(fetchMock.mock.calls[1][1].body).payer
    expect(payer).toEqual({
      name: "Cliente",
      email: "order-1@cliente.veopag.local",
      document: "12345678909",
    })
  })

  it("reuses the cached token across calls for the same client", async () => {
    const creds = credentials()
    fetchMock
      .mockResolvedValueOnce(json({ token: "jwt-3" }))
      .mockResolvedValue(json({ qrCodeResponse: { transactionId: "tx", qrcode: "PIX" } }))

    await createCharge(creds, input)
    await createCharge(creds, input)

    const loginCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith("/api/auth/login"),
    )
    expect(loginCalls).toHaveLength(1)
  })

  it("surfaces login failures", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "Credenciais inválidas" }, 401))
    expect(await createCharge(credentials(), input)).toEqual({
      ok: false,
      error: "Credenciais inválidas",
    })
  })

  it("reports the HTTP status when login has no message", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 500))
    expect(await createCharge(credentials(), input)).toEqual({
      ok: false,
      error: "Falha na autenticação (HTTP 500)",
    })
  })

  it("reports network errors during login", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"))
    expect(await createCharge(credentials(), input)).toEqual({
      ok: false,
      error: "socket hang up",
    })
  })

  it("surfaces deposit failures", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ token: "jwt-4" }))
      .mockResolvedValueOnce(json({ message: "Valor inválido" }, 400))
    expect(await createCharge(credentials(), input)).toEqual({
      ok: false,
      error: "Valor inválido",
    })
  })

  it("re-authenticates after the deposit is rejected with 401", async () => {
    const creds = credentials()
    fetchMock
      .mockResolvedValueOnce(json({ token: "stale" }))
      .mockResolvedValueOnce(json({ message: "Token expirado" }, 401))
      .mockResolvedValueOnce(json({ token: "fresh" }))
      .mockResolvedValueOnce(json({ qrCodeResponse: { transactionId: "tx", qrcode: "PIX" } }))

    expect((await createCharge(creds, input)).ok).toBe(false)
    expect((await createCharge(creds, input)).ok).toBe(true)
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe("Bearer fresh")
  })

  it("rejects responses without a PIX code", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ token: "jwt-5" }))
      .mockResolvedValueOnce(json({ qrCodeResponse: { transactionId: "tx" } }, 201))
    expect(await createCharge(credentials(), input)).toEqual({
      ok: false,
      error: "Resposta da VeoPag sem código PIX",
    })
  })

  it("falls back to the external id when no transaction id is returned", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ token: "jwt-6" }))
      .mockResolvedValueOnce(json({ qrcode: "PIX" }))
    expect(await createCharge(credentials(), input)).toEqual({
      ok: true,
      paymentId: "order-1",
      pixCode: "PIX",
    })
  })

  it("reports network errors during the deposit", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ token: "jwt-7" }))
      .mockRejectedValueOnce(new Error("ECONNRESET"))
    expect(await createCharge(credentials(), input)).toEqual({
      ok: false,
      error: "ECONNRESET",
    })
  })
})
