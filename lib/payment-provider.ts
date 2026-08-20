import "server-only"

export type PaymentPayer = {
  name?: string
  email?: string
  phone?: string
  document?: string
}

export type CreatePaymentInput = {
  amountCents: number
  externalId: string
  description: string
  customerName?: string
  callbackUrl?: string
  payer?: PaymentPayer
}

export type CreatePaymentResult =
  | {
      ok: true
      paymentId: string
      pixCode: string
    }
  | {
      ok: false
      code: "PAYMENT_AMBIGUOUS" | "PAYMENT_PROVIDER_ERROR" | "PAYMENT_NOT_CONFIGURED" | "PAYMENT_INVALID" | "PAYMENT_SPLIT_UNREPRESENTABLE"
      error: string
    }

export type CheckPaymentResult =
  | {
      ok: true
      paymentId: string
      status: "approved" | "pending" | "refused"
      amountCents?: number
    }
  | {
      ok: false
      code: "PAYMENT_PROVIDER_ERROR" | "PAYMENT_NOT_CONFIGURED" | "PAYMENT_NOT_FOUND"
      error: string
    }

export interface PaymentProvider {
  readonly id: string
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>
  checkPayment(paymentId: string, externalId?: string): Promise<CheckPaymentResult>
}

export const PAYMENT_COMMISSION_CENTS = 75

export type SplitCalculation =
  | {
      ok: true
      commissionCents: number
      saleAmountCents: number
      splitPercent: string
    }
  | {
      ok: false
      code: "PAYMENT_INVALID" | "PAYMENT_SPLIT_UNREPRESENTABLE"
      error: string
    }

/**
 * Calculates the percentage needed to represent a fixed commission.
 *
 * The provider documentation does not specify the accepted decimal precision
 * for splitTax. We therefore do not round or truncate here: the exact decimal
 * representation is sent and callers must treat provider-side precision as an
 * explicit compatibility check.
 */
export function calculateFixedCommissionSplit(
  saleAmountCents: number,
  commissionCents = PAYMENT_COMMISSION_CENTS,
): SplitCalculation {
  if (!Number.isSafeInteger(saleAmountCents) || saleAmountCents <= 0) {
    return { ok: false, code: "PAYMENT_INVALID", error: "Valor da venda inválido." }
  }
  if (!Number.isSafeInteger(commissionCents) || commissionCents <= 0 || commissionCents >= saleAmountCents) {
    return { ok: false, code: "PAYMENT_SPLIT_UNREPRESENTABLE", error: "A comissão fixa não pode ser representada neste valor." }
  }

  // splitPercent = commission / sale * 100. Reduce the fraction before
  // checking whether its decimal expansion terminates. A non-terminating
  // result cannot guarantee exactly R$0.75 when the provider's precision is
  // undocumented, so it is rejected instead of rounded silently.
  const zero = BigInt(0)
  const two = BigInt(2)
  const five = BigInt(5)
  const ten = BigInt(10)
  const numerator = BigInt(commissionCents) * BigInt(100)
  let denominator = BigInt(saleAmountCents)
  const gcd = (a: bigint, b: bigint): bigint => (b === zero ? a : gcd(b, a % b))
  const divisor = gcd(numerator, denominator)
  const reducedNumerator = numerator / divisor
  denominator /= divisor

  let decimalPlaces = 0
  let denominatorProbe = denominator
  while (denominatorProbe % two === zero) {
    denominatorProbe /= two
    decimalPlaces += 1
  }
  while (denominatorProbe % five === zero) {
    denominatorProbe /= five
    decimalPlaces += 1
  }
  if (denominatorProbe !== BigInt(1)) {
    return {
      ok: false,
      code: "PAYMENT_SPLIT_UNREPRESENTABLE",
      error: "A precisão documentada da Mistic Pay não permite garantir a comissão fixa para este valor.",
    }
  }

  let scale = BigInt(1)
  for (let index = 0; index < decimalPlaces; index += 1) scale *= ten
  const scaled = reducedNumerator * (scale / denominator)
  const integerPart = scaled / scale
  const fractionalPart = decimalPlaces > 0 ? (scaled % scale).toString().padStart(decimalPlaces, "0").replace(/0+$/, "") : ""
  return {
    ok: true,
    commissionCents,
    saleAmountCents,
    splitPercent: fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart.toString(),
  }
}

export function amountToCents(amount: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null
  const cents = Math.round(amount * 100)
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}

export function centsToAmount(cents: number): number {
  return cents / 100
}

export function normalizeProviderStatus(raw: unknown): "approved" | "pending" | "refused" {
  const status = String(raw ?? "").trim().toLowerCase()
  if (["completo", "complete", "completed", "paid", "approved", "confirmed", "success"].includes(status)) return "approved"
  if (["cancelado", "cancelled", "canceled", "refused", "failed", "expired", "rejected"].includes(status)) return "refused"
  return "pending"
}
