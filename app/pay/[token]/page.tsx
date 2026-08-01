import { db } from "@/lib/db"
import { orders, settings } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { generatePixQrDataUrl, parsePixConfig } from "@/lib/pix"
import { PaymentClient } from "./payment-client"

export const dynamic = "force-dynamic"

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  let order
  try {
    const results = await db
      .select()
      .from(orders)
      .where(eq(orders.publicToken, token))
      .limit(1)
    order = results[0]
  } catch (err) {
    console.error("[PayPage] Order lookup failed:", err)
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-lg font-semibold text-card-foreground">
            Erro ao carregar pagamento
          </p>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Ocorreu uma falha ao consultar os dados do seu pedido. Por favor, recarregue a página.
          </p>
          <a href={`/pay/${token}`} className="mt-6 block w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
            Recarregar
          </a>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-lg font-semibold text-card-foreground">
            Pagamento não encontrado
          </p>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Este link de pagamento é inválido ou expirou. Gere um novo pedido no
            bot do Telegram.
          </p>
        </div>
      </main>
    )
  }

  // PIX config only used for display text (above-code text + copy label).
  let cfgRow
  try {
    const results = await db
      .select({ value: settings.value })
      .from(settings)
      .where(
        and(eq(settings.ownerId, order.ownerId), eq(settings.key, "pix.config")),
      )
    cfgRow = results[0]
  } catch (err) {
    console.error("[PayPage] Settings lookup failed:", err)
  }

  const pix = parsePixConfig(cfgRow?.value)

  const qrDataUrl = order.pixCode
    ? await generatePixQrDataUrl(order.pixCode).catch(() => null)
    : null

  const expired =
    order.paymentStatus === "pending" &&
    order.expiresAt != null &&
    Date.now() > order.expiresAt.getTime()

  const initialStatus =
    order.paymentStatus === "approved"
      ? "approved"
      : order.paymentStatus === "cancelled"
        ? "cancelled"
        : order.paymentStatus === "refused"
          ? "refused"
          : expired
            ? "expired"
            : "pending"

  return (
    <PaymentClient
      token={token}
      orderId={order.id}
      productName={order.productName ?? "Produto digital"}
      amount={Number(order.amount)}
      pixCode={order.pixCode ?? ""}
      qrDataUrl={qrDataUrl}
      expiresAt={order.expiresAt ? order.expiresAt.toISOString() : null}
      initialStatus={initialStatus}
      aboveCodeText={pix.aboveCodeText}
      copyLabel={pix.copyButton.text}
      approvedMessage={pix.approvedMessage}
      expiredMessage={pix.expiredMessage}
    />
  )
}
