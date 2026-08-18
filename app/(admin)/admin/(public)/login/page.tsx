import { redirect } from "next/navigation"
import { GhostLogo } from "@/components/ghost-logo"
import { AdminLoginForm } from "@/components/admin-login-form"
import { getSessionUser } from "@/lib/session"
import { ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminLoginPage() {
  const user = await getSessionUser()

  if (user?.role === "admin" && user.ownerId === null) redirect("/admin")
  if (user) redirect("/admin/forbidden")

  return (
    <main className="min-h-screen bg-admin-ink px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/[0.10] bg-admin-surface shadow-[0_30px_100px_rgba(0,0,0,0.34)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative hidden min-h-[680px] overflow-hidden border-r border-white/[0.08] bg-[radial-gradient(circle_at_20%_10%,rgba(180,217,133,0.14),transparent_35%),linear-gradient(145deg,#10251A,#0B1712)] p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-admin-copper/10 blur-3xl" />
            <div className="relative"><GhostLogo className="mb-8 h-24 w-24" /><p className="font-space text-xs font-black uppercase tracking-[0.28em] text-admin-copper">DYNORBOT / CONTROL PLANE</p><h1 className="mt-4 max-w-md text-5xl font-black leading-[0.95] tracking-[-0.07em] text-white">A operação da plataforma começa aqui.</h1><p className="mt-6 max-w-md text-sm leading-7 text-white/55">Uma área reservada para governança, vendas consolidadas, comissões, membros e configurações globais.</p></div>
            <div className="relative grid grid-cols-2 gap-3 text-xs text-white/50"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><ShieldCheck className="mb-3 h-5 w-5 text-admin-lime" /><span className="block font-bold text-white/75">Acesso protegido</span><span className="mt-1 block leading-5">Autorização de plataforma em cada rota.</span></div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><span className="mb-3 block font-space text-2xl font-black text-admin-gold">01</span><span className="block font-bold text-white/75">Control plane</span><span className="mt-1 block leading-5">Dados globais separados de cada tenant.</span></div></div>
          </section>

          <section className="flex min-h-[620px] flex-col justify-center p-6 sm:p-10 lg:p-14">
            <div className="lg:hidden"><GhostLogo className="mb-5 h-20 w-20" /><p className="font-space text-[10px] font-black uppercase tracking-[0.24em] text-admin-copper">DYNORBOT / CONTROL PLANE</p></div>
            <div className="max-w-md"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-admin-lime/20 bg-admin-lime/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-admin-lime"><ShieldCheck className="h-3.5 w-3.5" /> Entrada administrativa</div><h2 className="text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">Acesso ao painel Admin</h2><p className="mt-3 text-sm leading-6 text-white/50">Entre com a conta de administrador da plataforma. Contas de vendedores não podem acessar este ambiente.</p><AdminLoginForm /></div>
            <p className="mt-10 text-center text-[11px] leading-5 text-white/30">Este acesso não cria contas. Se você não possui uma conta administrativa, procure o responsável pela plataforma.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
