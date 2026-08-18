import Link from "next/link"
import { ArrowLeft, ShieldX } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function AdminForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-ink px-4 py-8 text-white">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-admin-surface p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.34)] sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-admin-copper/30 bg-admin-copper/10 text-admin-copper"><ShieldX className="h-8 w-8" /></div>
        <p className="mt-6 font-space text-[10px] font-black uppercase tracking-[0.24em] text-admin-copper">Control plane protegido</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">Acesso não autorizado</h1>
        <p className="mt-4 text-sm leading-6 text-white/50">Esta sessão não possui perfil de administrador da plataforma. O painel de vendedores permanece em um ambiente separado.</p>
        <Link href="/sign-in" className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/75 transition-colors hover:border-admin-lime/40 hover:text-admin-lime"><ArrowLeft className="h-4 w-4" /> Voltar ao login normal</Link>
      </section>
    </main>
  )
}
