import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle } from "lucide-react"

export function SecretRow({
  label,
  envVar,
  masked,
  configured,
}: {
  label: string
  envVar: string
  masked: string | null
  configured: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <code className="text-xs text-muted-foreground">{envVar}</code>
      </div>
      <div className="flex items-center gap-3">
        {masked && (
          <code className="hidden text-xs text-muted-foreground sm:inline">
            {masked}
          </code>
        )}
        {configured ? (
          <Badge className="gap-1 bg-success/15 text-success">
            <CheckCircle2 className="h-3 w-3" /> Configurado
          </Badge>
        ) : (
          <Badge className="gap-1 bg-warning/15 text-warning">
            <AlertTriangle className="h-3 w-3" /> Pendente
          </Badge>
        )}
      </div>
    </div>
  )
}
