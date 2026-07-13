"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Check, Copy, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "pending" | "approved" | "expired" | "cancelled" | "refused"

type Props = {
  token: string
  orderId: number
  productName: string
  amount: number
  pixCode: string
  qrDataUrl: string | null
  expiresAt: string | null
  initialStatus: Status
  aboveCodeText: string
  copyLabel: string
  approvedMessage: string
  expiredMessage: string
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function PaymentClient(props: Props) {
  const [status, setStatus] = useState<Status>(props.initialStatus)
  const [copied, setCopied] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isFinal =
    status === "approved" || status === "cancelled" || status === "refused"

  // Live countdown based on the server-provided expiry.
  useEffect(() => {
    if (!props.expiresAt || isFinal) return
    const target = new Date(props.expiresAt).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setRemaining(diff)
      if (diff <= 0) setStatus((s) => (s === "pending" ? "expired" : s))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [props.expiresAt, isFinal])

  const checkStatus = useCallback(
    async (manual = false) => {
      if (manual) setChecking(true)
      try {
        const res = await fetch(`/api/pay/${props.token}/status`, {
          cache: "no-store",
        })
        if (res.ok) {
          const data = (await res.json()) as { status: Status }
          setStatus(data.status)
        }
      } catch {
        // Network hiccup — keep the current status and retry on the next poll.
      } finally {
        if (manual) setChecking(false)
      }
    },
    [props.token],
  )

  // Poll the status every 4s while the payment is still open.
  useEffect(() => {
    if (isFinal || status === "expired") {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(() => checkStatus(false), 4000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [checkStatus, isFinal, status])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — the code stays visible/selectable as a fallback.
    }
  }

  const mmss =
    remaining != null
      ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(
          remaining % 60,
        ).padStart(2, "0")}`
      : null

  return (
    <main className="flex min-h-dvh items-start justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          {/* Header */}
          <header className="border-b border-border px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pedido #{props.orderId}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-card-foreground text-balance">
              {props.productName}
            </h1>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {formatBRL(props.amount)}
            </p>
          </header>

          {status === "approved" ? (
            <StatusPanel
              icon={<CheckCircle2 className="size-14 text-primary" />}
              title="Pagamento aprovado!"
              description={props.approvedMessage}
            />
          ) : status === "expired" ? (
            <StatusPanel
              icon={<XCircle className="size-14 text-muted-foreground" />}
              title="Pagamento expirado"
              description={props.expiredMessage}
            />
          ) : status === "cancelled" ? (
            <StatusPanel
              icon={<XCircle className="size-14 text-muted-foreground" />}
              title="Pedido cancelado"
              description="Este pedido foi cancelado. Faça um novo pedido no bot para pagar."
            />
          ) : status === "refused" ? (
            <StatusPanel
              icon={<XCircle className="size-14 text-destructive" />}
              title="Pagamento recusado"
              description="Não foi possível confirmar este pagamento. Tente gerar um novo PIX."
            />
          ) : (
            <div className="px-6 py-6">
              {/* Countdown + waiting badge */}
              <div className="mb-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Aguardando pagamento
                </span>
                {mmss && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Clock className="size-4" />
                    {mmss}
                  </span>
                )}
              </div>

              {/* QR Code */}
              {props.qrDataUrl ? (
                <div className="flex justify-center">
                  <div className="rounded-xl bg-white p-3">
                    <Image
                      src={props.qrDataUrl || "/placeholder.svg"}
                      alt={`QR Code PIX do pedido ${props.orderId}`}
                      width={240}
                      height={240}
                      className="size-[240px]"
                      unoptimized
                      priority
                    />
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-secondary p-4 text-center text-sm text-muted-foreground">
                  Não foi possível gerar o QR Code. Use o código copia e cola
                  abaixo.
                </p>
              )}

              {/* Above-code text */}
              <p className="mt-6 text-center text-sm text-muted-foreground text-pretty">
                {props.aboveCodeText}
              </p>

              {/* PIX copy-paste code */}
              <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
                <p className="break-all font-mono text-xs leading-relaxed text-card-foreground">
                  {props.pixCode}
                </p>
              </div>

              {/* Copy button */}
              <Button onClick={copy} className="mt-3 w-full" size="lg">
                {copied ? (
                  <>
                    <Check className="size-4" />
                    Código copiado!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    {props.copyLabel}
                  </>
                )}
              </Button>

              {/* Manual verify */}
              <Button
                onClick={() => checkStatus(true)}
                variant="outline"
                className="mt-2 w-full"
                size="lg"
                disabled={checking}
              >
                {checking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Clock className="size-4" />
                )}
                Verificar pagamento
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Pagamento processado via PIX. A confirmação é automática.
        </p>
      </div>
    </main>
  )
}

function StatusPanel({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon}
      <h2 className="text-xl font-semibold text-card-foreground text-balance">
        {title}
      </h2>
      <p className="max-w-xs text-sm text-muted-foreground text-pretty">
        {description}
      </p>
    </div>
  )
}
