import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

export const adminCurrency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export const adminNumber = new Intl.NumberFormat("pt-BR")

export function AdminPageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: { href: string; label: string } }) {
  return <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-space text-[10px] font-black uppercase tracking-[0.23em] text-admin-copper">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">{description}</p></div>{action && <Link href={action.href} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-admin-lime px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-admin-ink transition-shadow hover:shadow-[0_12px_28px_rgba(180,217,133,0.16)]">{action.label}<ArrowUpRight className="h-4 w-4" /></Link>}</div>
}

export function AdminKpi({ label, value, detail, icon: Icon, tone = "lime" }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: "lime" | "copper" | "gold" | "blue" }) {
  const toneClass = { lime: "border-admin-lime/20 bg-admin-lime/[0.07] text-admin-lime", copper: "border-admin-copper/20 bg-admin-copper/[0.07] text-admin-copper", gold: "border-admin-gold/20 bg-admin-gold/[0.07] text-admin-gold", blue: "border-sky-300/20 bg-sky-300/[0.06] text-sky-200" }[tone]
  return <article className="rounded-[1.35rem] border border-white/[0.08] bg-admin-surface p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{label}</p><p className="mt-3 text-2xl font-black tracking-[-0.05em] text-white">{value}</p>{detail && <p className="mt-2 text-xs text-white/40">{detail}</p>}</div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}><Icon className="h-4 w-4" /></span></div></article>
}

export function AdminPanel({ title, description, children, className = "" }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-[1.6rem] border border-white/[0.08] bg-admin-surface p-5 sm:p-6 ${className}`}><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black tracking-[-0.04em] text-white">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-white/40">{description}</p>}</div></div>{children}</section>
}

export function AdminBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "copper" }) {
  const classes = { neutral: "border-white/10 bg-white/[0.05] text-white/55", success: "border-admin-lime/20 bg-admin-lime/10 text-admin-lime", warning: "border-admin-gold/20 bg-admin-gold/10 text-admin-gold", danger: "border-red-300/20 bg-red-300/10 text-red-200", copper: "border-admin-copper/20 bg-admin-copper/10 text-admin-copper" }[tone]
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.10em] ${classes}`}>{children}</span>
}

export function AdminEmpty({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center"><p className="text-sm font-bold text-white/65">{title}</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/35">{description}</p></div>
}
