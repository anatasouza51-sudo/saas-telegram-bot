"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  getTelegramDiagnostics,
  type TelegramDiagnostics,
} from "@/app/actions/tg-channels"
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
} from "lucide-react"

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  )
}

// Diagnostics panel: explains, in plain language, whether auto-detection is
// working end to end (bot token -> webhook -> membership events -> detected
// chats) and surfaces concrete reasons when nothing shows up.
export function DiagnosticsPanel({
  initial,
}: {
  initial: TelegramDiagnostics | null
}) {
  const [diag, setDiag] = useState<TelegramDiagnostics | null>(initial)
  const [open, setOpen] = useState(false)
  const [loading, startLoad] = useTransition()

  const load = useCallback(() => {
    startLoad(async () => {
      try {
        setDiag(await getTelegramDiagnostics())
      } catch {
        // ignore
      }
    })
  }, [])

  useEffect(() => {
    if (open && !diag) load()
  }, [open, diag, load])

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Diagnóstico da detecção
          {diag && (
            <span className="text-muted-foreground">
              — {diag.detectedTotal} detectado(s), {diag.activeTotal} ativo(s)
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border p-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar diagnóstico
            </Button>
          </div>

          {!diag ? (
            <p className="text-sm text-muted-foreground">
              Carregando diagnóstico...
            </p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Check ok={diag.botConfigured} label="Token do bot configurado" />
                <Check
                  ok={diag.botOk}
                  label={
                    diag.botUsername
                      ? `Bot conectado (@${diag.botUsername})`
                      : "Comunicação com a API do Telegram"
                  }
                />
                <Check ok={diag.webhookSet} label="Webhook registrado" />
                <Check
                  ok={diag.webhookHasMemberUpdates}
                  label="Recebe eventos de entrada (my_chat_member)"
                />
              </div>

              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <span>
                  Atualizações pendentes:{" "}
                  <span className="font-mono">
                    {diag.pendingUpdates ?? "—"}
                  </span>
                </span>
                <span>
                  Grupos detectados:{" "}
                  <span className="font-mono">{diag.detectedTotal}</span>
                </span>
              </div>

              {diag.reasons.length > 0 && (
                <div className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
                  {diag.reasons.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-warning"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="text-pretty">{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {diag.reasons.length === 0 && diag.detectedTotal > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Tudo certo: a detecção automática está funcionando.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
