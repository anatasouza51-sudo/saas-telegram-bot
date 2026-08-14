import { requireCapability } from "@/lib/session"
import { GatewayForm } from "@/components/settings/gateway-form"
import { PixSettingsForm } from "@/components/settings/pix-settings-form"
import { getSettings } from "@/lib/settings"
import { parsePixConfig } from "@/lib/pix-config"
import { getAppBaseUrl } from "@/lib/urls"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"
import { ArrowUpRight, CheckCircle2, Clock3, CreditCard, ShieldCheck, Sparkles, WalletCards, Webhook } from "lucide-react"

export default async function GatewayPage() {
  let user
  try {
    user = await requireCapability("gateway.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/gateway" />
  }

  const gatewayProviders = [
    { id: "veopag", name: "VeoPag", logo: "/assets/logos/veopag-3d-transparent.png", enabled: true },
  ]

  const futureGateways = [
    { name: "Mercado Pago", type: "PIX e cartão" },
    { name: "Stripe", type: "Cartões" },
    { name: "Asaas", type: "PIX e boleto" },
  ]

  const keysToLoad = [
    "pix.config",
    ...gatewayProviders.flatMap((provider) => [`${provider.id}.publicKey`, `${provider.id}.secretKey`]),
  ]

  const saved = await safeLoad(
    "getSettings",
    () => getSettings(user.storeId, keysToLoad),
    {} as Record<string, string | null>,
  )

  const pixConfig = parsePixConfig(saved["pix.config"])
  const veopagConfigured = Boolean(saved["veopag.publicKey"])

  return (
    <div className="min-w-0 w-full space-y-6 px-3 pb-8 md:px-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-fuchsia-400/15 bg-[radial-gradient(circle_at_85%_15%,rgba(236,72,153,0.2),transparent_34%),linear-gradient(135deg,rgba(25,12,35,0.98),rgba(8,8,16,0.98))] p-5 shadow-[0_20px_80px_rgba(164,49,176,0.14)] md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">
              <WalletCards className="h-4 w-4" />
              Infraestrutura financeira
            </div>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">Gateways</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 md:text-base">
              Conecte os meios de pagamento da sua operação e acompanhe, em um só lugar, o estado de cada integração.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/65 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Credenciais protegidas
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">Sua operação</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">Gateway configurado</h2>
          </div>
          <span className="hidden text-xs text-white/40 md:block">1 integração disponível</span>
        </div>
        {await Promise.all(gatewayProviders.map(async (provider) => {
          const hasSecretKey = Boolean(saved[`${provider.id}.secretKey`])
          const maskedWebhookUrl = `${getAppBaseUrl()}/api/${provider.id}/webhook/${user.storeId}/••••••••`

          return (
            <GatewayForm
              key={provider.id}
              provider={provider.id}
              providerName={provider.name}
              logoUrl={provider.logo}
              configured={veopagConfigured}
              initial={{
                publicKey: saved[`${provider.id}.publicKey`] ?? "",
                hasSecretKey,
              }}
              maskedWebhookUrl={maskedWebhookUrl}
            />
          )
        }))}
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Ecossistema</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">Gateways disponíveis</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {futureGateways.map((gateway) => (
            <div key={gateway.name} className="group relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#100d16] p-4 transition-colors hover:border-fuchsia-300/25">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-fuchsia-500/5 blur-2xl transition-colors group-hover:bg-fuchsia-500/10" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <CreditCard className="h-6 w-6 text-white/35" />
                </div>
                <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200/70">Em breve</span>
              </div>
              <div className="relative mt-5 flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white/85">{gateway.name}</h3>
                  <p className="mt-1 text-xs text-white/40">{gateway.type}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/25" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#100d16] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="border-b border-white/10 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
                <Sparkles className="h-4 w-4" />
                Experiência de cobrança
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-white md:text-2xl">Pagamento PIX</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                Personalize os textos, os botões e o tempo de expiração exibidos na cobrança PIX no bot e na página de pagamento.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/45">
              <Webhook className="h-4 w-4 text-fuchsia-300" />
              Fluxo conectado ao VeoPag
            </div>
          </div>
        </div>
        <div className="p-5 md:p-6">
          <PixSettingsForm initial={pixConfig} />
        </div>
      </section>
    </div>
  )
}
