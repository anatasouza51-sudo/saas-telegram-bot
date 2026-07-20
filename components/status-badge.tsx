import { cn } from "@/lib/utils"

const PAYMENT_STYLES: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  approved: {
    label: "Aprovado",
    className: "bg-success/10 text-success border-success/20",
  },
  refused: {
    label: "Recusado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-white/5 text-muted-foreground border-white/10",
  },
}

const DELIVERY_STYLES: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Aguardando",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  delivered: {
    label: "Entregue",
    className: "bg-success/10 text-success border-success/20",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-white/5 text-muted-foreground border-white/10",
  },
}

const GENERIC_STYLES: Record<string, { label: string; className: string }> = {
  active: {
    label: "Ativo",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Inativo",
    className: "bg-white/5 text-muted-foreground border-white/10",
  },
  available: {
    label: "Disponível",
    className: "bg-success/10 text-success border-success/20",
  },
  reserved: {
    label: "Reservado",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  sold: {
    label: "Vendido",
    className: "bg-primary/10 text-primary border-primary/20",
  },
}

function Pill({
  label,
  className,
}: {
  label: string
  className: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  )
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = PAYMENT_STYLES[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  }
  return <Pill {...s} />
}

export function DeliveryStatusBadge({ status }: { status: string }) {
  const s = DELIVERY_STYLES[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  }
  return <Pill {...s} />
}

export function GenericStatusBadge({ status }: { status: string }) {
  const s = GENERIC_STYLES[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  }
  return <Pill {...s} />
}
