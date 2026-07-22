import { cn } from "@/lib/utils"

const PAYMENT_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  pending: {
    label: "Pendente",
    className: "bg-warning/10 text-warning border-warning/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]",
    dot: "bg-warning",
  },
  approved: {
    label: "Aprovado",
    className: "bg-success/10 text-success border-success/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]",
    dot: "bg-success",
  },
  refused: {
    label: "Recusado",
    className: "bg-destructive/10 text-destructive border-destructive/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
    dot: "bg-destructive",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-white/5 text-muted-foreground border-white/10",
    dot: "bg-muted-foreground",
  },
}

const DELIVERY_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  pending: {
    label: "Aguardando",
    className: "bg-warning/10 text-warning border-warning/20",
    dot: "bg-warning",
  },
  delivered: {
    label: "Entregue",
    className: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-white/5 text-muted-foreground border-white/10",
    dot: "bg-muted-foreground",
  },
}

const GENERIC_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  active: {
    label: "Ativo",
    className: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  inactive: {
    label: "Inativo",
    className: "bg-white/5 text-muted-foreground border-white/10",
    dot: "bg-muted-foreground",
  },
  available: {
    label: "Disponível",
    className: "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  reserved: {
    label: "Reservado",
    className: "bg-warning/10 text-warning border-warning/20",
    dot: "bg-warning",
  },
  sold: {
    label: "Vendido",
    className: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
}

function Pill({
  label,
  className,
  dot,
}: {
  label: string
  className: string
  dot?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
        className,
      )}
    >
      {dot && <span className={cn("w-1 h-1 rounded-full animate-pulse", dot)} />}
      {label}
    </span>
  )
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = PAYMENT_STYLES[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  }
  return <Pill {...s} />
}

export function DeliveryStatusBadge({ status }: { status: string }) {
  const s = DELIVERY_STYLES[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  }
  return <Pill {...s} />
}

export function GenericStatusBadge({ status }: { status: string }) {
  const s = GENERIC_STYLES[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  }
  return <Pill {...s} />
}
