import { requireCapability } from "@/lib/session"
import { GatewayForm } from "@/components/settings/gateway-form"
import { PixSettingsForm } from "@/components/settings/pix-settings-form"
import { getSettings } from "@/lib/settings"
import { parsePixConfig } from "@/lib/pix-config"
import { getAppBaseUrl } from "@/lib/urls"
import { safeLoad } from "@/lib/safe-load"
import { ErrorView } from "@/components/error-view"
import { ArrowUpRight, CreditCard, ShieldCheck, WalletCards } from "lucide-react"

export default async function GatewayPage() {
  let user: Awaited<ReturnType<typeof requireCapability>>
  try {
    user = await requireCapability("gateway.manage")
  } catch (e) {
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) throw e
    return <ErrorView retryHref="/gateway" />
  }

  const gatewayProviders = [
    { id: "veopag", name: "VeoPag", logo: "/assets/logos/veopag-3d-transparent.png" },
    { id: "misticpay", name: "Mistic Pay", logo: "" },
    { id: "oasyfy", name: "Oasy.fy", logo: "" },
  ]

  const futureGateways = [
    { name: "Stripe", type: "Cartões", logo: "" },
    { name: "Asaas", type: "PIX e boleto", logo: "" },
  ]

  const keysToLoad = [
    "pix.config",
    ...gatewayProviders.flatMap((provider) => [
      `${provider.id}.publicKey`,
      `${provider.id}.secretKey`,
      `${provider.id}.enabled`,
      ...(provider.id === "oasyfy" ? [`${provider.id}.producerId`, `${provider.id}.webhookToken`] : []),
    ]),
  ]

  const saved = await safeLoad(
    "getSettings",
    () => getSettings(user.storeId, keysToLoad),
    {} as Record<string, string | null>,
  )

  const pixConfig = parsePixConfig(saved["pix.config"])
  const configuredAndEnabled = gatewayProviders.filter((provider) => providerState(provider).enabled)
  const inactiveProviders = gatewayProviders.filter((provider) => !configuredAndEnabled.some((active) => active.id === provider.id))

  function providerState(provider: (typeof gatewayProviders)[number]) {
    const configured = provider.id === "oasyfy"
      ? Boolean(saved[`${provider.id}.publicKey`] && saved[`${provider.id}.secretKey`] && saved[`${provider.id}.producerId`])
      : Boolean(saved[`${provider.id}.publicKey`])
    const enabled = configured && saved[`${provider.id}.enabled`] !== "false"
    return { configured, enabled }
  }

  function renderGateway(provider: (typeof gatewayProviders)[number]) {
    const { configured, enabled } = providerState(provider)
    const hasSecretKey = Boolean(saved[`${provider.id}.secretKey`])
    const maskedWebhookUrl = `${getAppBaseUrl()}/api/${provider.id}/webhook/${user.storeId}/••••••••`

    return (
      <GatewayForm
        key={provider.id}
        provider={provider.id}
        providerName={provider.name}
        logoUrl={provider.logo}
        configured={configured}
        enabled={enabled}
        initial={{
          publicKey: saved[`${provider.id}.publicKey`] ?? "",
          hasSecretKey,
          hasProducerId: provider.id === "oasyfy" ? Boolean(saved[`${provider.id}.producerId`]) : undefined,
          hasWebhookToken: provider.id === "oasyfy" ? Boolean(saved[`${provider.id}.webhookToken`]) : undefined,
        }}
        maskedWebhookUrl={maskedWebhookUrl}
      />
    )
  }

  return (
    <div className="min-w-0 w-full space-y-6 px-3 pb-8 md:px-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-dashboard-accent-secondary/20 bg-[radial-gradient(circle_at_85%_15%,rgba(209,125,85,0.16),transparent_34%),linear-gradient(135deg,rgba(29,51,39,0.98),rgba(13,24,18,0.98))] p-5 shadow-[0_20px_80px_rgba(169,201,127,0.10)] md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-dashboard-accent-secondary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-dashboard-accent-secondary">
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

      {configuredAndEnabled.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-dashboard-accent-secondary">Sua operação</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">Gateway configurado</h2>
            </div>
            <span className="hidden text-xs text-white/40 md:block">{configuredAndEnabled.length} integração(ões) ativa(s)</span>
          </div>
          <div className="space-y-3">{configuredAndEnabled.map(renderGateway)}</div>
        </section>
      )}

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Ecossistema</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">Gateways disponíveis</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-dashboard-text-muted">Gateways desativados permanecem aqui para você reativar ou atualizar suas credenciais.</p>
        </div>
        <div className="space-y-3">
          {inactiveProviders.map(renderGateway)}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {futureGateways.map((gateway) => (
              <div key={gateway.name} className="group relative overflow-hidden rounded-[1.35rem] border border-dashboard-border bg-dashboard-surface p-4 transition-colors hover:border-dashboard-border-active">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-dashboard-accent-secondary/5 blur-2xl transition-colors group-hover:bg-dashboard-accent-secondary/10" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex h-16 w-16 items-center justify-center">
                    {gateway.logo ? (
                      <img src={gateway.logo} alt={`Logo ${gateway.name}`} className="h-16 w-16 object-contain drop-shadow-[0_8px_18px_rgba(169,201,127,0.20)]" />
                    ) : (
                      <CreditCard className="h-6 w-6 text-white/35" />
                    )}
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
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.7rem] border border-dashboard-border bg-dashboard-surface shadow-[0_18px_60px_rgba(20,36,29,0.28)]">
        <div className="border-b border-dashboard-border p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-dashboard-accent-secondary">Experiência de cobrança</div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-white md:text-2xl">Pagamento PIX</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-dashboard-text-muted">
                Personalize os textos, os botões e o tempo de expiração exibidos na cobrança PIX no bot e na página de pagamento.
              </p>
            </div>
            <div className="text-xs text-dashboard-text-muted">Fluxo conectado ao gateway selecionado</div>
          </div>
        </div>
        <div className="p-5 md:p-6">
          <PixSettingsForm initial={pixConfig} />
        </div>
      </section>
    </div>
  )
}
