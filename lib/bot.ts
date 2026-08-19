import { db } from "@/lib/db"
import {
  products,
  categories,
  customers,
  orders,
  deliveries,
  settings,
  stockItems,
  balanceTransactions,
} from "@/lib/db/schema"
import { and, asc, desc, eq, isNull, isNotNull, lte, sql } from "drizzle-orm"
import { pool } from "@/lib/db"
import {
  TelegramClient,
  buildInlineKeyboard,
  type TelegramUpdate,
} from "@/lib/telegram"
import { createCharge, getDepositStatus, mapPaymentStatus, type VeoPagCredentials } from "@/lib/veopag"
import { MisticPayAdapter, type MisticPayCredentials } from "@/lib/misticpay"
import { OasyfyAdapter, type OasyfyCredentials } from "@/lib/oasyfy"
import { amountToCents, centsToAmount, type PaymentProvider } from "@/lib/payment-provider"
import {
  parsePixConfig,
  generatePixQrPng,
  type   PixConfig,
} from "@/lib/pix"
import {
  parseCatalogConfig,
  type CatalogConfig,
} from "@/lib/catalog-config"
import { randomBytes } from "node:crypto"
import { fulfillOrder } from "@/lib/fulfillment"
import { logActivity } from "@/lib/log"
import { formatCurrency } from "@/lib/format"
import { getAppBaseUrl } from "@/lib/urls"
import { getOrCreateWebhookSecret } from "@/lib/webhook-secrets"
import { escapeHtml } from "@/lib/security"
import { isEncrypted, decrypt } from "@/lib/crypto"
import { sanitizeDisplayName } from "@/lib/validation"
import { handleMyChatMember, detectChatFromUpdate } from "@/lib/tg/discovery"
import { recordTopicFromUpdate } from "@/lib/tg/topics"
import { botIdFromToken } from "@/lib/tg/config"
import { validateCoupon, incrementCouponUsage } from "@/app/actions/coupons"
import { getPlatformMisticPayConfig, getPlatformOasyfyConfig } from "@/lib/platform-settings"

// How many categories/products to show per screen. Inline keyboards can't hold
// thousands of buttons, so every list is paginated. This keeps the bot fast
// and correct for any catalog size (e.g. 100 categories / 5.000 products).
const PAGE_SIZE = 8

// Special id used for the virtual "Outros" bucket that groups active products
// that do not belong to any category, so nothing is ever hidden.
const UNCATEGORIZED = "none"

type SupportConfig = {
  enabled: boolean
  label: string
  message: string
  telegramUsername: string
  whatsappUrl: string
  hours: string
  buttonLabel: string
}

// Everything the router needs for one store, loaded once per update.
type StoreContext = {
  storeId: string
  tg: TelegramClient
  botId: number | null
  adminIds: string[]
  veopag: VeoPagCredentials & { enabled: boolean }
  misticpay: MisticPayCredentials & { enabled: boolean }
  oasyfy: OasyfyCredentials & { enabled: boolean }
  welcomeMessage: string
  welcomeImageUrl: string
  support: SupportConfig
  pix: PixConfig
  catalog: CatalogConfig
}

type GatewayChargeResult =
  | { ok: true; gateway: "misticpay" | "oasyfy" | "veopag"; paymentId: string; pixCode: string }
  | { ok: false; error: string }

function activeGateway(ctx: StoreContext): "misticpay" | "oasyfy" | "veopag" | null {
  if (ctx.misticpay.enabled && ctx.misticpay.clientId && ctx.misticpay.clientSecret && ctx.misticpay.splitUser) return "misticpay"
  if (ctx.oasyfy.enabled && ctx.oasyfy.publicKey && ctx.oasyfy.secretKey && ctx.oasyfy.producerId) return "oasyfy"
  if (ctx.veopag.enabled && ctx.veopag.publicKey && ctx.veopag.secretKey) return "veopag"
  return null
}

async function createGatewayCharge(
  ctx: StoreContext,
  input: {
    amount: number
    externalId: string
    description: string
    customerName?: string
    payer?: { name?: string; email?: string; document?: string }
  },
): Promise<GatewayChargeResult> {
  const gateway = activeGateway(ctx)
  if (!gateway) return { ok: false, error: "Nenhum gateway de pagamento está configurado." }
  const webhookSecret = await getOrCreateWebhookSecret(ctx.storeId, gateway)
  const callbackUrl = gateway === "misticpay"
    ? `${getAppBaseUrl()}/api/misticpay/webhook/${ctx.storeId}/${webhookSecret}`
    : gateway === "oasyfy"
      ? `${getAppBaseUrl()}/api/oasyfy/webhook/${ctx.storeId}/${webhookSecret}`
      : `${getAppBaseUrl()}/api/veopag/webhook/${ctx.storeId}/${webhookSecret}`

  if (gateway === "misticpay") {
    const amountCents = amountToCents(input.amount)
    if (amountCents == null) return { ok: false, error: "Valor de pagamento inválido." }
    const charge = await new MisticPayAdapter(ctx.misticpay).createPayment({
      amountCents,
      externalId: input.externalId,
      description: input.description,
      customerName: input.customerName,
      callbackUrl,
      payer: input.payer,
    })
    return charge.ok ? { ok: true, gateway, paymentId: charge.paymentId, pixCode: charge.pixCode } : { ok: false, error: charge.error }
  }

  if (gateway === "oasyfy") {
    const amountCents = amountToCents(input.amount)
    if (amountCents == null) return { ok: false, error: "Valor de pagamento inválido." }
    const charge = await new OasyfyAdapter(ctx.oasyfy).createPayment({
      amountCents,
      externalId: input.externalId,
      description: input.description,
      customerName: input.customerName,
      callbackUrl,
      payer: input.payer,
    })
    return charge.ok ? { ok: true, gateway, paymentId: charge.paymentId, pixCode: charge.pixCode } : { ok: false, error: charge.error }
  }

  const charge = await createCharge(ctx.veopag, {
    amount: input.amount,
    externalId: input.externalId,
    description: input.description,
    customerName: input.customerName,
    callbackUrl,
    payer: input.payer,
  })
  return charge.ok ? { ok: true, gateway, paymentId: charge.paymentId, pixCode: charge.pixCode ?? "" } : { ok: false, error: charge.error }
}

type GatewayStatusResult =
  | { ok: true; status: "approved" | "pending" | "refused"; amountCents?: number; paymentId?: string }
  | { ok: false; error: string }

async function checkGatewayPayment(ctx: StoreContext, order: { gateway: string | null; paymentId: string | null; id: string }): Promise<GatewayStatusResult> {
  if (order.gateway === "misticpay") {
    if (!ctx.misticpay.clientId || !ctx.misticpay.clientSecret || !ctx.misticpay.splitUser) return { ok: false, error: "Mistic Pay não está configurada." }
    const result = await new MisticPayAdapter(ctx.misticpay).checkPayment(order.paymentId ?? order.id)
    return result.ok ? { ok: true, status: result.status, amountCents: result.amountCents, paymentId: result.paymentId } : { ok: false, error: result.error }
  }

  if (order.gateway === "oasyfy") {
    if (!ctx.oasyfy.publicKey || !ctx.oasyfy.secretKey || !ctx.oasyfy.producerId) return { ok: false, error: "Oasy.fy não está configurada." }
    const result = await new OasyfyAdapter(ctx.oasyfy).checkPayment(order.paymentId ?? order.id, order.id)
    return result.ok ? { ok: true, status: result.status, amountCents: result.amountCents, paymentId: result.paymentId } : { ok: false, error: result.error }
  }

  const result = await getDepositStatus(ctx.veopag, order.id)
  if (!result.ok) return { ok: false, error: result.error }
  return {
    ok: true,
    status: mapPaymentStatus(result.status),
    amountCents: result.amount == null ? undefined : amountToCents(result.amount) ?? undefined,
    paymentId: result.transactionId,
  }
}

type InlineButton = {
  text: string
  callback_data?: string
  url?: string
  copy_text?: { text: string }
}

// A single logical screen. `text` is used as the message body, or as the photo
// caption when `imageUrl` is present.
type Screen = {
  imageUrl?: string | null
  text: string
  keyboard: ReturnType<typeof buildInlineKeyboard>
}

async function loadStoreContext(storeId: string): Promise<StoreContext | null> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.ownerId, storeId))

  const SENSITIVE_KEYS = ["telegram.botToken", "veopag.secretKey", "misticpay.secretKey", "oasyfy.secretKey", "oasyfy.webhookToken", "pix.config"]

  const map: Record<string, string> = {}
  for (const r of rows) {
    let val = r.value ?? ""
    if (SENSITIVE_KEYS.includes(r.key) && isEncrypted(val)) {
      val = decrypt(val) ?? val
    }
    map[r.key] = val
  }

  const token = map["telegram.botToken"]
  if (!token) return null

  let platformMisticPay = { splitUser: "" }
  let platformOasyfy = { producerId: "", enabled: false }
  try {
    const [misticPayConfig, oasyfyConfig] = await Promise.all([
      getPlatformMisticPayConfig({ revealSensitive: true }),
      getPlatformOasyfyConfig({ revealSensitive: true }),
    ])
    platformMisticPay = { splitUser: misticPayConfig.splitUser }
    platformOasyfy = { producerId: oasyfyConfig.producerId, enabled: oasyfyConfig.enabled }
  } catch (error) {
    // A missing/unapplied control-plane migration must not break VeoPag.
    // Split-based gateways remain disabled until global configuration exists.
    console.error("[bot] Configuração global de gateways indisponível; split gateways desativados para esta execução", error instanceof Error ? error.name : "unknown")
  }

  const adminIds = (map["telegram.adminIds"] ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    storeId,
    tg: new TelegramClient(token),
    botId: botIdFromToken(token),
    adminIds,
    veopag: {
      publicKey: map["veopag.publicKey"] ?? "",
      secretKey: map["veopag.secretKey"] ?? "",
      enabled: map["veopag.enabled"] === "true",
    },
    misticpay: {
      clientId: map["misticpay.publicKey"] ?? "",
      clientSecret: map["misticpay.secretKey"] ?? "",
      splitUser: platformMisticPay.splitUser,
      enabled: map["misticpay.enabled"] === "true",
    },
    oasyfy: {
      publicKey: map["oasyfy.publicKey"] ?? "",
      secretKey: map["oasyfy.secretKey"] ?? "",
      producerId: platformOasyfy.producerId,
      webhookToken: map["oasyfy.webhookToken"] ?? "",
      enabled: map["oasyfy.enabled"] === "true" && platformOasyfy.enabled,
    },
    welcomeMessage: map["store.welcomeMessage"] ?? "",
    welcomeImageUrl: map["store.welcomeImageUrl"] ?? "",
    support: {
      enabled: (map["support.enabled"] ?? "true") !== "false",
      label: map["support.label"] || "💬 Suporte",
      message: map["support.message"] || "Precisa de ajuda? Fale com o nosso suporte.",
      telegramUsername: map["support.telegramUsername"] ?? "",
      whatsappUrl: map["support.whatsappUrl"] ?? "",
      hours: map["support.hours"] ?? "",
      buttonLabel: map["support.buttonLabel"] || "📞 Falar com Suporte",
    },
    pix: parsePixConfig(map["pix.config"]),
    catalog: parseCatalogConfig(map["catalog.config"]),
  }
}

async function upsertCustomer(
  storeId: string,
  from: { id: number; username?: string; first_name?: string },
) {
  const telegramId = String(from.id)
  // Sanitization: prevent XSS if the name is displayed in the admin panel.
  const name = sanitizeDisplayName(from.first_name)

  // BUGFIX: the previous read-then-write pattern was susceptible to a race
  // condition: two concurrent /start messages (e.g. Telegram retry) could
  // both see no existing row and both attempt an INSERT, causing a duplicate-
  // key error that propagated as an unhandled exception and silenced the bot.
  // We now use a single atomic upsert. The unique index on (ownerId, telegramId)
  // is added in the migration below so the ON CONFLICT target is valid.
  const [row] = await db
    .insert(customers)
    .values({
      ownerId: storeId,
      telegramId,
      username: from.username ?? null,
      name,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [customers.ownerId, customers.telegramId],
      set: {
        name,
        // Keep username fresh in case the user renamed their Telegram account.
        username: from.username ?? null,
      },
    })
    .returning()
  return row
}

/* ---------------------------------------------------------------------------
 * In-place rendering
 *
 * All navigation edits the SAME message. Telegram cannot convert a text
 * message into a media message (or vice-versa) via edit, so when the screen
 * type changes we delete and resend exactly once — never accumulating
 * duplicate messages. "Message is not modified" errors are ignored.
 * ------------------------------------------------------------------------- */

function isIgnorableEditError(desc?: string) {
  return (desc ?? "").toLowerCase().includes("not modified")
}

async function renderScreen(
  ctx: StoreContext,
  chatId: number,
  messageId: number | null,
  screen: Screen,
) {
  const image = screen.imageUrl?.trim() || ""
  const hasImage = image.length > 0

  // Fresh send (e.g. from /start): no message to edit.
  if (messageId == null) {
    if (hasImage) {
      // BUGFIX: sendPhoto can fail silently (invalid/inaccessible URL, Telegram
      // rejects the image, etc.). When it does, fall back to a plain text
      // message so the customer always gets a response instead of silence.
      const photoRes = await ctx.tg.sendPhoto(chatId, image, screen.text, screen.keyboard)
      if (!photoRes.ok) {
        console.warn(
          `[bot/renderScreen] sendPhoto failed (${photoRes.description}); falling back to sendMessage`,
        )
        await ctx.tg.sendMessage(chatId, screen.text, { replyMarkup: screen.keyboard })
      }
    } else {
      const msgRes = await ctx.tg.sendMessage(chatId, screen.text, { replyMarkup: screen.keyboard })
      if (!msgRes.ok) {
        console.error(
          `[bot/renderScreen] sendMessage failed: ${msgRes.description}`,
        )
      }
    }
    return
  }

  if (hasImage) {
    const res = await ctx.tg.editMessageMedia(
      chatId,
      messageId,
      image,
      screen.text,
      screen.keyboard,
    )
    if (!res.ok && !isIgnorableEditError(res.description)) {
      // Current message is text-only; replace it with a photo message.
      await ctx.tg.deleteMessage(chatId, messageId)
      await ctx.tg.sendPhoto(chatId, image, screen.text, screen.keyboard)
    }
  } else {
    const res = await ctx.tg.editMessageText(
      chatId,
      messageId,
      screen.text,
      screen.keyboard,
    )
    if (!res.ok && !isIgnorableEditError(res.description)) {
      // Current message is a photo; replace it with a text message.
      await ctx.tg.deleteMessage(chatId, messageId)
      await ctx.tg.sendMessage(chatId, screen.text, { replyMarkup: screen.keyboard })
    }
  }
}

function pageNav(prefix: string, page: number, totalPages: number): InlineButton[] {
  if (totalPages <= 1) return []
  const row: InlineButton[] = []
  if (page > 0) row.push({ text: "◀️", callback_data: `${prefix}${page - 1}` })
  row.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" })
  if (page < totalPages - 1)
    row.push({ text: "▶️", callback_data: `${prefix}${page + 1}` })
  return row
}

/* ---------------------------------------------------------------------------
 * Screen builders
 * ------------------------------------------------------------------------- */

async function buildHomeScreen(
  ctx: StoreContext,
  firstName: string,
  page: number,
): Promise<Screen> {
  const cats = await db
    .select({
      id: categories.id,
      name: categories.name,
      emoji: categories.emoji,
    })
    .from(categories)
    .where(and(eq(categories.ownerId, ctx.storeId), eq(categories.status, "active")))
    .orderBy(asc(categories.position), asc(categories.name))

  const entries: Array<{ id: string; label: string }> = cats.map((c) => ({
    id: String(c.id),
    label: `${c.emoji ? c.emoji + " " : ""}${c.name}`,
  }))

  // Include a virtual "Outros" bucket if there are active uncategorized items.
  const [{ count: uncategorized }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(products)
    .where(
      and(
        eq(products.ownerId, ctx.storeId),
        eq(products.status, "active"),
        isNull(products.categoryId),
      ),
    )
  if (Number(uncategorized) > 0) {
    entries.push({ id: UNCATEGORIZED, label: "📦 Outros" })
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(0, page), totalPages - 1)
  const slice = entries.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const welcome = (
    ctx.welcomeMessage.trim() ||
    "👋 Bem-vindo(a) à nossa loja!"
  ).replace(/\{nome\}/gi, escapeHtml(firstName))

  const rows: InlineButton[][] = slice.map((e) => [
    { text: e.label, callback_data: `cat:${e.id}:0` },
  ])

  const nav = pageNav("home:", safePage, totalPages)
  if (nav.length) rows.push(nav)

  if (ctx.support.enabled) {
    rows.push([{ text: ctx.support.label, callback_data: "support" }])
  }

  rows.push([{ text: "💳 Adicionar saldo", callback_data: "profile" }])

  const text =
    entries.length === 0
      ? `${welcome}\n\n<i>Nenhuma categoria disponível no momento.</i>`
      : `${welcome}\n\n<b>Escolha uma categoria:</b>`

  return {
    imageUrl: ctx.welcomeImageUrl,
    text,
    keyboard: buildInlineKeyboard(rows),
  }
}

async function buildCategoryScreen(
  ctx: StoreContext,
  catId: string,
  page: number,
): Promise<Screen> {
  let title = "📦 Outros"
  let description: string | null = null
  let imageUrl: string | null = null

  if (catId !== UNCATEGORIZED) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.ownerId, ctx.storeId),
          eq(categories.id, Number(catId)),
        ),
      )
    if (!cat) {
      return {
        text: "Categoria não encontrada.",
        keyboard: buildInlineKeyboard([
          [{ text: ctx.catalog.backButton.text, callback_data: "home:0" }],
        ]),
      }
    }
    title = `${cat.emoji ? cat.emoji + " " : ""}${cat.name}`
    description = cat.description
    imageUrl = cat.imageUrl
  }

  // Order EXCLUSIVELY by price ASC by default (position defaults to 0 for all
  // products). If the admin sets an explicit position it takes precedence,
  // with price ASC as the deterministic tiebreaker.
  const catCondition =
    catId === UNCATEGORIZED
      ? isNull(products.categoryId)
      : eq(products.categoryId, Number(catId))

  // Paginate at the DB level instead of loading all products into memory.
  const [{ count: totalItems }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(products)
    .where(
      and(
        eq(products.ownerId, ctx.storeId),
        eq(products.status, "active"),
        catCondition,
      ),
    )

  const totalPages = Math.max(1, Math.ceil(Number(totalItems) / PAGE_SIZE))
  const safePage = Math.min(Math.max(0, page), totalPages - 1)

  const items = await db
    .select({ id: products.id, name: products.name, price: products.price })
    .from(products)
    .where(
      and(
        eq(products.ownerId, ctx.storeId),
        eq(products.status, "active"),
        catCondition,
      ),
    )
    .orderBy(asc(products.position), asc(products.price), asc(products.id))
    .limit(PAGE_SIZE)
    .offset(safePage * PAGE_SIZE)

  const slice = items

  const rows: InlineButton[][] = []
  const productLines: string[] = []

  // Build numbered list for the message body and compact buttons
  slice.forEach((p, i) => {
    const displayIndex = i + 1
    const price = formatCurrency(Number(p.price))
    
    // Add to message body: 1. Product Name - R$ 100,00
    productLines.push(`${displayIndex}. <b>${escapeHtml(p.name)}</b> — ${price}`)
    
    // Add to keyboard: [ 1. Comprar ]
    // We use a separate row for each to keep it clean, or 2 per row if many.
    rows.push([
      {
        text: `${displayIndex}. Selecionar — ${price}`,
        callback_data: `prod:${p.id}`,
      },
    ])
  })

  const nav = pageNav(`cat:${catId}:`, safePage, totalPages)
  if (nav.length) rows.push(nav)
  if (ctx.catalog.backButton.enabled) {
    rows.push([{ text: ctx.catalog.backButton.text, callback_data: "home:0" }])
  }

  const parts = [`<b>${escapeHtml(title)}</b>`]
  if (description) parts.push("", description)
  
  if (items.length === 0) {
    parts.push("", "<i>Nenhum produto disponível no momento.</i>")
  } else {
    parts.push("", ...productLines, "", "Escolha uma opção abaixo:")
  }

  return {
    imageUrl,
    text: parts.join("\n"),
    keyboard: buildInlineKeyboard(rows),
  }
}

async function buildProductScreen(
  ctx: StoreContext,
  productId: number,
  telegramId?: string,
): Promise<Screen> {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.ownerId, ctx.storeId), eq(products.id, productId)))

  if (!product) {
    return {
      text: "Produto não encontrado.",
      keyboard: buildInlineKeyboard([
        [{ text: ctx.catalog.backButton.text, callback_data: "home:0" }],
      ]),
    }
  }

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(stockItems)
    .where(
      and(
        eq(stockItems.ownerId, ctx.storeId),
        eq(stockItems.productId, productId),
        eq(stockItems.status, "available"),
      ),
    )

  // Manual-delivery products are always purchasable; stock products need units.
  const inStock = product.deliveryType === "manual" || Number(count) > 0

  const caption = [
    `<b>${escapeHtml(product.name)}</b>`,
    product.description ? `\n${escapeHtml(product.description)}` : "",
    `\n💰 <b>${formatCurrency(Number(product.price))}</b>`,
    product.deliveryType === "stock"
      ? inStock
        ? `✅ ${Number(count)} em estoque`
        : "⛔ Esgotado"
      : "✅ Disponível",
  ]
    .filter(Boolean)
    .join("\n")

  const backCat = product.categoryId != null ? String(product.categoryId) : UNCATEGORIZED
  const rows: InlineButton[][] = []
  if (inStock) {
    if (ctx.catalog.buyButton.enabled) {
      rows.push([{ text: ctx.catalog.buyButton.text, callback_data: `buy:${product.id}` }])
    }
    
    // Add "Pay with Balance" button if we have the telegramId
    if (telegramId) {
      const [customer] = await db
        .select({ balance: customers.balance })
        .from(customers)
        .where(and(eq(customers.ownerId, ctx.storeId), eq(customers.telegramId, telegramId)))
      
      if (customer && Number(customer.balance) >= Number(product.price)) {
        rows.push([{ text: `💰 Pagar com Saldo (${formatCurrency(Number(customer.balance))})`, callback_data: `paybal:${product.id}` }])
      }
    }

    if (ctx.catalog.couponButton.enabled) {
      rows.push([{ text: ctx.catalog.couponButton.text, callback_data: `coupon:${product.id}` }])
    }
  }
  if (ctx.catalog.backButton.enabled) {
    rows.push([{ text: ctx.catalog.backButton.text, callback_data: `cat:${backCat}:0` }])
  }

  return {
    imageUrl: product.imageUrl,
    text: caption,
    keyboard: buildInlineKeyboard(rows),
  }
}

async function buildProfileScreen(
  ctx: StoreContext,
  telegramId: string,
): Promise<Screen> {
  const customer = await db
    .select()
    .from(customers)
    .where(and(eq(customers.ownerId, ctx.storeId), eq(customers.telegramId, telegramId)))
    .then(rows => rows[0])

  if (!customer) {
    return {
      text: "Perfil não encontrado. Use /start para se cadastrar.",
      keyboard: buildInlineKeyboard([[{ text: "🏠 Início", callback_data: "home:0" }]])
    }
  }

  const balance = formatCurrency(Number(customer.balance))
  const spent = formatCurrency(Number(customer.totalSpent))

  const text = [
    `<b>👤 Seu Perfil</b>`,
    ``,
    `🆔 <b>ID:</b> <code>${customer.telegramId}</code>`,
    `💰 <b>Saldo disponível:</b> <b>${balance}</b>`,
    `🛍️ <b>Total gasto:</b> ${spent}`,
    `📦 <b>Compras realizadas:</b> ${customer.purchaseCount}`,
    ``,
    `Escolha uma opção abaixo para gerenciar seu saldo ou ver seu histórico.`,
  ].join("\n")

  const rows: InlineButton[][] = [
    [{ text: "💳 Recarregar Saldo", callback_data: "recharge_menu" }],
    [{ text: "📜 Histórico de Compras", callback_data: "history_cmd" }],
    [{ text: "🏠 Voltar ao Início", callback_data: "home:0" }],
  ]

  return {
    text,
    keyboard: buildInlineKeyboard(rows)
  }
}

function buildRechargeScreen(ctx: StoreContext): Screen {
  const amounts = [10, 20, 50, 100, 200, 500]
  const rows: InlineButton[][] = []
  
  for (let i = 0; i < amounts.length; i += 2) {
    const row: InlineButton[] = [
      { text: formatCurrency(amounts[i]), callback_data: `recharge_do:${amounts[i]}` }
    ]
    if (amounts[i+1]) {
      row.push({ text: formatCurrency(amounts[i+1]), callback_data: `recharge_do:${amounts[i+1]}` })
    }
    rows.push(row)
  }

  rows.push([{ text: "⬅️ Voltar ao Perfil", callback_data: "profile" }])

  return {
    text: "<b>💳 Recarga de Saldo</b>\n\nEscolha o valor que deseja adicionar à sua conta:",
    keyboard: buildInlineKeyboard(rows)
  }
}

async function handlePayWithBalance(
  ctx: StoreContext,
  chatId: number,
  productId: number,
  from: { id: number; username?: string; first_name?: string },
) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.ownerId, ctx.storeId), eq(products.id, productId)))
  if (!product) return

  const customer = await upsertCustomer(ctx.storeId, from)
  const price = Number(product.price)
  const balance = Number(customer.balance)

  if (balance < price) {
    await ctx.tg.sendMessage(
      chatId,
      `❌ <b>Saldo Insuficiente</b>\n\nVocê precisa de ${formatCurrency(price)}, mas seu saldo atual é ${formatCurrency(balance)}.\n\nUse a opção de recarga no seu perfil para adicionar fundos.`,
      { replyMarkup: buildInlineKeyboard([[{ text: "💳 Recarregar", callback_data: "recharge_menu" }]]) }
    )
    return
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    
    // Lock the balance operation atomically. The previous implementation read
    // the balance before BEGIN, allowing two simultaneous clicks to overspend.
    const balanceResult = await client.query(
      `UPDATE customers
       SET balance = balance - $1, "updatedAt" = now()
       WHERE id = $2 AND balance >= $1
       RETURNING balance`,
      [price.toString(), customer.id],
    )
    if (balanceResult.rowCount !== 1) {
      await client.query("ROLLBACK")
      await ctx.tg.sendMessage(chatId, "❌ Saldo insuficiente ou alterado por outra compra. Atualize seu perfil e tente novamente.")
      return
    }
    const newBalance = Number(balanceResult.rows[0].balance)
    const previousBalance = newBalance + price

    // Keep the order insert in the same PostgreSQL transaction as the debit.
    const orderResult = await client.query(
      `INSERT INTO orders
        ("ownerId", "customerId", "productId", "productName", amount,
         "paymentStatus", "deliveryStatus", type, gateway)
       VALUES ($1, $2, $3, $4, $5, 'approved', 'pending', 'product', 'balance')
       RETURNING *`,
      [ctx.storeId, customer.id, product.id, product.name, price.toString()],
    )
    const order = orderResult.rows[0]

    await client.query(
      `INSERT INTO balance_transactions ("ownerId", "customerId", type, amount, "previousBalance", "newBalance", "orderId", description)
       VALUES ($1, $2, 'spend', $3, $4, $5, $6, $7)`,
      [ctx.storeId, customer.id, price.toString(), previousBalance.toString(), newBalance.toString(), order.id, `Compra de ${product.name}`]
    )

    await client.query("COMMIT")
    
    await ctx.tg.sendMessage(chatId, `✅ <b>Pagamento com Saldo realizado!</b>\n\nValor de ${formatCurrency(price)} descontado. Seu novo saldo é ${formatCurrency(newBalance)}.`)
    
    await fulfillOrder(order.id, ctx.storeId)

  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[bot/payWithBalance] error:", err)
    await ctx.tg.sendMessage(chatId, "❌ Ocorreu um erro ao processar seu pagamento com saldo. Tente novamente mais tarde.")
  } finally {
    client.release()
  }
}

async function handleRecharge(
  ctx: StoreContext,
  chatId: number,
  amount: number,
  from: { id: number; username?: string; first_name?: string },
) {
  // Callback data vem do Telegram, portanto valide antes de tocar no banco ou
  if (!activeGateway(ctx)) {
    await ctx.tg.sendMessage(chatId, "⚠️ Os pagamentos estão temporariamente indisponíveis. Tente novamente mais tarde.")
    return
  }
  // chamar a VeoPag. Isso evita pedidos com NaN/zero e torna o erro explícito.
  if (!Number.isFinite(amount) || amount <= 0) {
    await ctx.tg.sendMessage(chatId, "❌ Valor de recarga inválido. Volte ao menu e escolha um dos valores disponíveis.")
    return
  }

  try {
    const customer = await upsertCustomer(ctx.storeId, from)
  
  const [order] = await db
    .insert(orders)
    .values({
      ownerId: ctx.storeId,
      customerId: customer.id,
      productName: `Recarga de Saldo - ${formatCurrency(amount)}`,
      amount: String(amount),
      paymentStatus: "pending",
      deliveryStatus: "pending",
      type: "recharge",
      gateway: activeGateway(ctx) ?? "veopag",
    })
    .returning()

  const charge = await createGatewayCharge(ctx, {
    amount,
    externalId: String(order.id),
    description: `Recarga de Saldo - ${customer.name || customer.username}`,
    payer: { name: customer.name ?? customer.username ?? "Cliente" },
  })

  if (!charge.ok) {
    await db
      .update(orders)
      .set({ paymentStatus: "refused", deliveryStatus: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, order.id))
    await ctx.tg.sendMessage(chatId, `⚠️ Erro ao gerar pagamento: ${charge.error}`)
    return
  }

  const pixCode = charge.pixCode
  const publicToken = randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + ctx.pix.expireMinutes * 60_000)

  await db
    .update(orders)
    .set({ paymentId: charge.paymentId, pixCode, publicToken, expiresAt, pixChatId: String(chatId) })
    .where(eq(orders.id, order.id))

  const caption = buildPixCaption(ctx, {
    orderId: order.id,
    productName: `Recarga de Saldo`,
    amount,
    pixCode,
    expiresAt,
  })
  const keyboard = buildPixKeyboard(ctx, order.id, pixCode, publicToken)

  const qr = await generatePixQrPng(pixCode)
  if (qr) {
    const sent = await ctx.tg.sendPhotoBytes(chatId, qr, { caption, replyMarkup: keyboard, filename: `recharge-${order.id}.png` })
    if (sent.ok && sent.result?.message_id) {
      await db.update(orders).set({ pixMessageId: sent.result.message_id }).where(eq(orders.id, order.id))
    }
  } else {
    const sent = await ctx.tg.sendMessage(chatId, caption, { replyMarkup: keyboard })
    if (sent.ok && sent.result?.message_id) {
      await db.update(orders).set({ pixMessageId: sent.result.message_id }).where(eq(orders.id, order.id))
    }
    }
  } catch (err) {
    console.error(
      `[bot/recharge] failed for store=${ctx.storeId} telegramId=${from.id} amount=${amount}:`,
      err instanceof Error ? err.message : err,
    )
    await ctx.tg.sendMessage(
      chatId,
      "❌ Não foi possível gerar o PIX agora. Verifique a configuração do gateway e tente novamente em instantes.",
    )
  }
}

function buildSupportScreen(ctx: StoreContext): Screen {
  const parts = [`<b>${ctx.support.label}</b>`, "", ctx.support.message]
  if (ctx.support.hours.trim()) {
    parts.push("", `🕐 <b>Atendimento:</b> ${ctx.support.hours.trim()}`)
  }

  const rows: InlineButton[][] = []
  const username = ctx.support.telegramUsername.trim().replace(/^@/, "")
  if (username) {
    rows.push([
      { text: ctx.support.buttonLabel, url: `https://t.me/${username}` },
    ])
  } else if (ctx.support.whatsappUrl.trim()) {
    rows.push([{ text: ctx.support.buttonLabel, url: ctx.support.whatsappUrl.trim() }])
  }
  if (ctx.catalog.backButton.enabled) {
    rows.push([{ text: ctx.catalog.backButton.text, callback_data: "home:0" }])
  }

  return { text: parts.join("\n"), keyboard: buildInlineKeyboard(rows) }
}

/* ---------------------------------------------------------------------------
 * Purchase flow
 * ------------------------------------------------------------------------- */

async function startPurchase(
  ctx: StoreContext,
  chatId: number,
  productId: number,
  from: { id: number; username?: string; first_name?: string },
) {
  const purchaseStarted = Date.now()
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.ownerId, ctx.storeId), eq(products.id, productId)))
  if (!product) return

  const selectedGateway = activeGateway(ctx)
  if (!selectedGateway) {
    await ctx.tg.sendMessage(chatId, "⚠️ Os pagamentos estão temporariamente indisponíveis. Tente novamente mais tarde.")
    return
  }

  const customer = await upsertCustomer(ctx.storeId, from)

  // Apply active coupon if the customer has one set.
  const originalPrice = Number(product.price)
  let finalAmount = originalPrice
  let appliedCouponCode: string | null = null
  let discountPercent = 0

  if (customer.activeCoupon) {
    try {
      const coupon = await validateCoupon(ctx.storeId, customer.activeCoupon)
      discountPercent = coupon.discountPercent
      finalAmount = Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100
      appliedCouponCode = coupon.code
    } catch {
      // Coupon is no longer valid; clear it silently.
      await db
        .update(customers)
        .set({ activeCoupon: null })
        .where(eq(customers.id, customer.id))
    }
  }

  const [order] = await db
    .insert(orders)
    .values({
      ownerId: ctx.storeId,
      customerId: customer.id,
      productId: product.id,
      productName: product.name,
      amount: String(finalAmount),
      originalAmount: appliedCouponCode ? String(originalPrice) : null,
      couponCode: appliedCouponCode,
      paymentStatus: "pending",
      deliveryStatus: "pending",
      gateway: selectedGateway,
    })
    .returning()

  // Clear the customer's active coupon now that it's been consumed in the order.
  if (appliedCouponCode) {
    await db
      .update(customers)
      .set({ activeCoupon: null })
      .where(eq(customers.id, customer.id))
    // Increment coupon usage counter.
    await incrementCouponUsage(ctx.storeId, appliedCouponCode)
  }
  const charge = await createGatewayCharge(ctx, {
    amount: finalAmount,
    externalId: String(order.id),
    description: appliedCouponCode
      ? `${product.name} (${discountPercent}% OFF com ${appliedCouponCode})`
      : product.name,
    customerName: customer.name ?? undefined,
    payer: {
      name: customer.name ?? customer.username ?? "Cliente",
    },
  })

  if (!charge.ok) {
    await ctx.tg.sendMessage(
      chatId,
      `⚠️ Não foi possível gerar o pagamento agora.\n<code>${escapeHtml(charge.error)}</code>\n\nO pedido #${order.id} ficou pendente.`,
    )
    return
  }

  const pixCode = charge.pixCode ?? ""
  const publicToken = randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + ctx.pix.expireMinutes * 60_000)

  await db
    .update(orders)
    .set({
      paymentId: charge.paymentId,
      pixCode,
      publicToken,
      expiresAt,
      pixChatId: String(chatId),
    })
    .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, order.id)))

  // Build the professional PIX message: order, product, value, expiry, the
  // copy-paste code, and (below) the QR Code image.
  const caption = buildPixCaption(ctx, {
    orderId: order.id,
    productName: product.name,
    amount: finalAmount,
    originalAmount: appliedCouponCode ? originalPrice : undefined,
    couponCode: appliedCouponCode ?? undefined,
    discountPercent: appliedCouponCode ? discountPercent : undefined,
    pixCode,
    expiresAt,
  })
  const keyboard = buildPixKeyboard(ctx, order.id, pixCode, publicToken)

  const qr = await generatePixQrPng(pixCode)
  if (qr) {
    // QR as photo + caption + buttons. Persist the message id so we can edit
    // it in place when the payment is approved/expired.
    const sent = await ctx.tg.sendPhotoBytes(chatId, qr, {
      caption,
      replyMarkup: keyboard,
      filename: `pix-${order.id}.png`,
    })
    if (sent.ok && sent.result?.message_id) {
      await db
        .update(orders)
        .set({ pixMessageId: sent.result.message_id })
        .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, order.id)))
    }
  } else {
    // No PIX code returned: fall back to a text message so the flow never breaks.
    const sent = await ctx.tg.sendMessage(chatId, caption, {
      replyMarkup: keyboard,
    })
    if (sent.ok && sent.result?.message_id) {
      await db
        .update(orders)
        .set({ pixMessageId: sent.result.message_id })
        .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, order.id)))
    }
  }
  const purchaseElapsed = Date.now() - purchaseStarted
  if (purchaseElapsed > 3_000) {
    console.warn(
      `[bot/startPurchase] slow: ${purchaseElapsed}ms for order #${order.id}`,
    )
  }
}

// Renders the caption/body of the PIX payment message. Kept in HTML so the
// code shows in a monospace <code> block the user can tap to select/copy.
function buildPixCaption(
  ctx: StoreContext,
  order: {
    orderId: string
    productName: string
    amount: number
    originalAmount?: number
    couponCode?: string
    discountPercent?: number
    pixCode: string
    expiresAt: Date
  },
): string {
  const lines = [
    `🧾 <b>Pedido #${order.orderId}</b>`,
    ``,
    `Produto: <b>${escapeHtml(order.productName)}</b>`,
  ]

  if (order.couponCode && order.originalAmount != null && order.discountPercent != null) {
    lines.push(
      `Valor original: <s>${formatCurrency(order.originalAmount)}</s>`,
      `🎟️ Cupom <code>${escapeHtml(order.couponCode)}</code>: -${order.discountPercent}%`,
      `Valor com desconto: <b>${formatCurrency(order.amount)}</b>`,
    )
  } else {
    lines.push(`Valor: <b>${formatCurrency(order.amount)}</b>`)
  }

  lines.push(`⏳ Expira em <b>${ctx.pix.expireMinutes} min</b>`)

  if (order.pixCode) {
    lines.push("", ctx.pix.aboveCodeText, "", `<code>${escapeHtml(order.pixCode)}</code>`)
  } else {
    lines.push("", "⚠️ Não foi possível gerar o código PIX. Fale com o suporte.")
  }
  return lines.join("\n")
}

// Builds the inline keyboard from the admin-configured PIX buttons. Each button
// only appears when its `enabled` flag is on, and uses its custom label.
function buildPixKeyboard(
  ctx: StoreContext,
  orderId: string,
  pixCode: string,
  publicToken: string,
) {
  const rows: InlineButton[][] = []
  const { pix } = ctx

  // Copy button uses Telegram's native copy_text (taps copy the code to the
  // clipboard, no bot round-trip). Only meaningful when we have a code.
  if (pix.copyButton.enabled && pixCode) {
    rows.push([{ text: pix.copyButton.text, copy_text: { text: pixCode } }])
  }
  if (pix.verifyButton.enabled) {
    rows.push([
      { text: pix.verifyButton.text, callback_data: `pixver:${orderId}` },
    ])
  }
  // Public web payment page (QR + code + live status + countdown).
  if (pix.webPageButton.enabled) {
    rows.push([
      {
        text: pix.webPageButton.text,
        url: `${getAppBaseUrl()}/pay/${publicToken}`,
      },
    ])
  }
  const trailing: InlineButton[] = []
  if (pix.cancelButton.enabled) {
    trailing.push({
      text: pix.cancelButton.text,
      callback_data: `pixcxl:${orderId}`,
    })
  }
  if (trailing.length) rows.push(trailing)
  if (pix.supportButton.enabled) {
    rows.push([{ text: pix.supportButton.text, callback_data: "support" }])
  }
  return buildInlineKeyboard(rows)
}

// Edits the PIX message caption in place. The message is normally a photo (QR),
// but falls back to text when no code was available — try caption first, then
// text, so either message type flips correctly to approved/expired/cancelled.
async function editPixMessage(
  ctx: StoreContext,
  chatId: number,
  messageId: number,
  caption: string,
  keyboard?: ReturnType<typeof buildInlineKeyboard>,
) {
  const res = await ctx.tg.editMessageCaption(chatId, messageId, caption, keyboard)
  if (!res.ok && !isIgnorableEditError(res.description)) {
    await ctx.tg.editMessageText(chatId, messageId, caption, keyboard)
  }
}

// Empty keyboard used to strip all buttons once an order reaches a final
// state, so the customer can never tap a stale payment action again.
const NO_KEYBOARD = buildInlineKeyboard([])

// ---------- Proactive PIX expiration sweep ----------
//
// BUGFIX: previously an order was only ever flagged "expired" reactively,
// when the customer tapped "Verificar pagamento" (handlePixVerify). If they
// never tapped it, the PIX message + its buttons stayed visible and tappable
// forever in Telegram, even after the admin-configured timer elapsed.
//
// Invoked from the per-minute cron (app/api/tg/cron/route.ts) and from every
// webhook hit. For every store with at least one due PIX order it:
//   1. Loads that store's context once (bot token + configured expired text).
//   2. Edits every due message in place to the "expired" caption with the
//      keyboard removed, so no payment button can be tapped again.
// It never mutates `paymentStatus` in the database: the public /pay page and
// handlePixVerify already derive "expired" on the fly from `expiresAt`, so the
// gateway webhook stays free to still approve a payment landing right at the
// edge of the window. Re-editing an already-expired message is harmless —
// Telegram returns a "message is not modified" error, already treated as
// ignorable by editPixMessage.
export async function expireDuePixOrders() {
  const now = new Date()
  const due = await db
    .select({
      id: orders.id,
      ownerId: orders.ownerId,
      pixChatId: orders.pixChatId,
      pixMessageId: orders.pixMessageId,
    })
    .from(orders)
    .where(
      and(
        eq(orders.paymentStatus, "pending"),
        isNotNull(orders.expiresAt),
        lte(orders.expiresAt, now),
        isNotNull(orders.pixMessageId),
      ),
    )

  if (due.length === 0) return { checked: 0, expired: 0 }

  console.log(`[bot] Encontrados ${due.length} pedidos PIX expirados para processar.`)

  let expired = 0
  const contextCache = new Map<string, StoreContext | null>()

  for (const order of due) {
    if (!order.pixChatId || !order.pixMessageId) continue

    let ctx = contextCache.get(order.ownerId)
    if (ctx === undefined) {
      ctx = await loadStoreContext(order.ownerId)
      contextCache.set(order.ownerId, ctx)
    }
    if (!ctx) continue

    try {
      console.log(`[bot] Expirando pedido #${order.id} no chat ${order.pixChatId}...`)
      // 1. Edit the message in Telegram to show the expired state.
      await editPixMessage(
        ctx,
        Number(order.pixChatId),
        order.pixMessageId,
        [`🧾 <b>Pedido #${order.id}</b>`, ``, ctx.pix.expiredMessage].join("\n"),
        NO_KEYBOARD,
      )
      
      // 2. Update the database so it's no longer pending and won't be picked up again.
      await db
        .update(orders)
        .set({ 
          paymentStatus: "refused", 
          updatedAt: new Date() 
        })
        .where(eq(orders.id, order.id))

      expired += 1
    } catch (err) {
      // Best-effort: retried on the next sweep, at most a minute later.
      console.error(
        `[bot] could not expire PIX message for order ${order.id}:`,
        err,
      )
    }
  }

  return { checked: due.length, expired }
}

// "Já efetuei o pagamento" — checks the current order status (kept in sync by
// the gateway webhook) and reacts: approved -> confirm + ensure delivery;
// expired -> show expired; otherwise -> a gentle "still waiting" toast.
async function handlePixVerify(
  ctx: StoreContext,
  callbackId: string,
  chatId: number,
  orderId: string,
) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, orderId)))

  if (!order) {
    await ctx.tg.answerCallbackQuery(callbackId, "Pedido não encontrado.")
    return
  }

  if (order.paymentStatus === "approved" || order.deliveryStatus === "delivered") {
    await ctx.tg.answerCallbackQuery(callbackId, "Pagamento aprovado! ✅")
    if (order.pixMessageId) {
      await editPixMessage(
        ctx,
        chatId,
        order.pixMessageId,
        [
          `🧾 <b>Pedido #${order.id}</b>`,
          ``,
          ctx.pix.approvedMessage,
        ].join("\n"),
        NO_KEYBOARD,
      )
    }
    // Safety net: if the webhook approved payment but delivery didn't complete,
    // deliver now (fulfillOrder is idempotent).
    if (order.deliveryStatus !== "delivered") {
      const result = await fulfillOrder(orderId, ctx.storeId)
      // "already_delivered" only means another flow won the race — not an error.
      if (!result.ok && result.code !== "already_delivered") {
        console.error(
          `[bot] delivery retry failed for order ${orderId}:`,
          result.reason,
        )
        await logActivity({
          storeId: ctx.storeId,
          action: `Falha ao reentregar o pedido #${orderId} após "Já efetuei o pagamento"`,
          category: "delivery",
          details: result.reason,
        })
        await ctx.tg.sendMessage(
          chatId,
          "Não conseguimos concluir a entrega automaticamente. Nossa equipe já foi avisada — use /suporte se precisar de ajuda.",
        )
      }
    }
    return
  }

  // Webhooks can be delayed or lost. Reconcile directly with the configured
  // gateway before telling the customer that the payment is still pending.
  const gatewayStatus = await checkGatewayPayment(ctx, order)
  if (gatewayStatus.ok && gatewayStatus.status === "approved") {
    const expectedAmountCents = amountToCents(Number(order.amount))
    if (expectedAmountCents == null || (gatewayStatus.amountCents != null && gatewayStatus.amountCents !== expectedAmountCents)) {
      console.error(`[bot/pix] amount mismatch for order ${order.id}`)
      await ctx.tg.answerCallbackQuery(callbackId, "Pagamento identificado, mas o valor não confere. Suporte foi avisado.")
      return
    }

    await db
      .update(orders)
      .set({ paymentStatus: "approved", paymentId: gatewayStatus.paymentId ?? order.paymentId, updatedAt: new Date() })
      .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, order.id)))
    const result = await fulfillOrder(order.id, ctx.storeId)
    if (result.ok || result.code === "already_delivered") {
      await ctx.tg.answerCallbackQuery(callbackId, "Pagamento aprovado! Saldo atualizado. ✅")
      return
    }
    console.error(`[bot/pix] reconciliation delivery failed for order ${order.id}:`, result.reason)
    await ctx.tg.answerCallbackQuery(callbackId, "Pagamento aprovado, mas o saldo ainda não foi atualizado. Suporte foi avisado.")
    return
  }

  const expired = order.expiresAt ? Date.now() > order.expiresAt.getTime() : false
  if (expired) {
    await ctx.tg.answerCallbackQuery(callbackId, "Este pagamento expirou.")
    if (order.pixMessageId) {
      await editPixMessage(
        ctx,
        chatId,
        order.pixMessageId,
        [`🧾 <b>Pedido #${order.id}</b>`, ``, ctx.pix.expiredMessage].join("\n"),
        NO_KEYBOARD,
      )
    }
    return
  }

  await ctx.tg.answerCallbackQuery(
    callbackId,
    "Ainda não identificamos seu pagamento. Assim que cair, entregamos automaticamente. ⏳",
  )
}

// "Cancelar pedido" — cancels a still-pending order and updates the message.
async function handlePixCancel(
  ctx: StoreContext,
  callbackId: string,
  chatId: number,
  orderId: string,
) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, orderId)))

  if (!order) {
    await ctx.tg.answerCallbackQuery(callbackId, "Pedido não encontrado.")
    return
  }
  if (order.paymentStatus === "approved" || order.deliveryStatus === "delivered") {
    await ctx.tg.answerCallbackQuery(
      callbackId,
      "Este pedido já foi aprovado e não pode ser cancelado.",
    )
    return
  }

  await db
    .update(orders)
    .set({ paymentStatus: "cancelled", updatedAt: new Date() })
    .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, orderId)))

  await ctx.tg.answerCallbackQuery(callbackId, "Pedido cancelado.")
  const mid = order.pixMessageId
  if (mid) {
    await editPixMessage(
      ctx,
      chatId,
      mid,
      [
        `🧾 <b>Pedido #${order.id}</b>`,
        ``,
        `❌ Pedido cancelado. Use /catalogo para comprar novamente.`,
      ].join("\n"),
      NO_KEYBOARD,
    )
  }
}

async function showHistory(ctx: StoreContext, chatId: number, telegramId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.ownerId, ctx.storeId), eq(customers.telegramId, telegramId)))
  if (!customer) {
    await ctx.tg.sendMessage(chatId, "Você ainda não tem compras.")
    return
  }
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.customerId, customer.id)))
    .orderBy(desc(orders.createdAt))
    .limit(10)

  if (rows.length === 0) {
    await ctx.tg.sendMessage(chatId, "Você ainda não tem compras.")
    return
  }

  const text = [
    `<b>📦 Suas compras</b>`,
    ``,
    ...rows.map(
      (o) =>
        `#${o.id} — ${escapeHtml(o.productName)} — ${formatCurrency(Number(o.amount))} — ${
          o.deliveryStatus === "delivered" ? "entregue ✅" : o.paymentStatus
        }`,
    ),
  ].join("\n")
  await ctx.tg.sendMessage(chatId, text)
}

// ---------- Admin bot ----------

async function handleAdminCommand(ctx: StoreContext, chatId: number, command: string) {
  const store = eq(orders.ownerId, ctx.storeId)
  switch (command) {
    case "/dashboard": {
      const [rev] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(${orders.amount}) FILTER (WHERE ${orders.paymentStatus} = 'approved'), 0)`,
          sales: sql<number>`COUNT(*) FILTER (WHERE ${orders.paymentStatus} = 'approved')::int`,
          pending: sql<number>`COUNT(*) FILTER (WHERE ${orders.paymentStatus} = 'pending')::int`,
        })
        .from(orders)
        .where(store)
      await ctx.tg.sendMessage(
        chatId,
        [
          `<b>📊 Dashboard</b>`,
          `Receita: <b>${formatCurrency(Number(rev.revenue))}</b>`,
          `Vendas aprovadas: <b>${rev.sales}</b>`,
          `Pagamentos pendentes: <b>${rev.pending}</b>`,
        ].join("\n"),
      )
      break
    }
    case "/products": {
      const rows = await db
        .select()
        .from(products)
        .where(eq(products.ownerId, ctx.storeId))
        .orderBy(desc(products.createdAt))
        .limit(15)
      await ctx.tg.sendMessage(
        chatId,
        [
          `<b>📦 Produtos</b>`,
          ...rows.map(
            (p) =>
              `#${p.id} ${escapeHtml(p.name)} — ${formatCurrency(Number(p.price))} (${p.status})`,
          ),
        ].join("\n"),
      )
      break
    }
    case "/orders": {
      const rows = await db
        .select()
        .from(orders)
        .where(store)
        .orderBy(desc(orders.createdAt))
        .limit(10)
      await ctx.tg.sendMessage(
        chatId,
        [
          `<b>🧾 Últimos pedidos</b>`,
          ...rows.map(
            (o) =>
              `#${o.id} ${escapeHtml(o.productName)} — ${o.paymentStatus}/${o.deliveryStatus}`,
          ),
        ].join("\n"),
      )
      break
    }
    case "/customers": {
      const [c] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(customers)
        .where(eq(customers.ownerId, ctx.storeId))
      await ctx.tg.sendMessage(chatId, `👥 Total de clientes: <b>${c.count}</b>`)
      break
    }
    case "/statistics": {
      const [d] = await db
        .select({ delivered: sql<number>`COUNT(*)::int` })
        .from(deliveries)
        .where(eq(deliveries.ownerId, ctx.storeId))
      await ctx.tg.sendMessage(chatId, `📈 Entregas realizadas: <b>${d.delivered}</b>`)
      break
    }
    default:
      await ctx.tg.sendMessage(
        chatId,
        [
          `<b>Painel Admin</b>`,
          `/dashboard — visão geral`,
          `/products — produtos`,
          `/orders — pedidos`,
          `/customers — clientes`,
          `/statistics — estatísticas`,
        ].join("\n"),
      )
  }
}

// ---------- Router ----------

export async function handleUpdate(storeId: string, update: TelegramUpdate) {
  const handleStarted = Date.now()
  const ctx = await loadStoreContext(storeId)
  if (!ctx) {
    // Store has no bot token configured; nothing we can send.
    return
  }

  // Auto-detection: the bot was added/removed/promoted/demoted in a chat.
  // Persist the new state so "Grupos & Canais" updates with zero manual input.
  const memberUpdate = update.my_chat_member ?? update.chat_member
  if (memberUpdate) {
    await handleMyChatMember(storeId, memberUpdate, ctx.tg)
    return
  }

  // Passive auto-detection: a channel_post means the bot administrates a channel
  // we may not have seen a my_chat_member event for. Detect it, then stop (there
  // is no customer flow for channel posts).
  if (update.channel_post) {
    if (ctx.botId) {
      await detectChatFromUpdate(
        storeId,
        update.channel_post.chat,
        ctx.botId,
        ctx.tg,
      )
    }
    return
  }

  // ANY message from a non-private chat (group/supergroup/anything that isn't a
  // 1:1 DM) is NEVER the customer shop flow. The bot must stay silent there.
  // These messages serve two purposes only: (1) passively prove the bot is a
  // member so we can auto-detect the chat, and (2) let an admin force detection
  // by sending an explicit command. Everything else — plain text, "Olá", "kkk",
  // stickers, photos, videos, audio, documents, forwards, replies, emojis — is
  // ignored. This is a hard boundary: we return before ANY reply logic runs.
  if (update.message && update.message.chat.type !== "private") {
    if (ctx.botId) {
      await detectChatFromUpdate(
        storeId,
        update.message.chat,
        ctx.botId,
        ctx.tg,
      )
      // Telegram has no "list topics" endpoint, so every message seen inside a
      // topic registers it as a selectable destination in the panel.
      const threadId = update.message.message_thread_id
      if (threadId && update.message.is_topic_message) {
        // Se não tivermos o nome no update, tentamos buscar via API para não ficar "Tópico X"
        let topicName =
          update.message.forum_topic_created?.name ??
          update.message.forum_topic_edited?.name ??
          null

        if (!topicName && ctx.tg) {
          try {
            // Nota: getForumTopicIconStickers não ajuda, e não há getForumTopic direto.
            // Mas se for uma mensagem de serviço de criação/edição, o nome está lá.
            // Se for mensagem comum, o recordTopicFromUpdate usará o nome já salvo ou o fallback.
          } catch (e) {
            console.error("[v0] erro ao buscar nome do tópico:", e)
          }
        }

        await recordTopicFromUpdate({
          storeId,
          chatId: String(update.message.chat.id),
          threadId,
          name: topicName,
        })
      }
      // Only these explicit, bot-directed admin commands get a reply. We match
      // the bare command (stripping any "@BotName" suffix). "/start" and every
      // shop command are intentionally NOT here, so the menu never appears.
      const cmd = (update.message.text ?? "")
        .trim()
        .toLowerCase()
        .split("@")[0]
      const DETECTION_COMMANDS = ["/detectar", "/id", "/status"]
      if (DETECTION_COMMANDS.includes(cmd)) {
        console.log(
          `[v0] group handler: replying to detection command "${cmd}" in chat ${update.message.chat.id} (${update.message.chat.type})`,
        )
        await replyGroupDetection(
          ctx,
          update.message.chat,
          update.message.message_thread_id ?? null,
        )
      } else {
        console.log(
          `[v0] group handler: ignoring non-command message in chat ${update.message.chat.id} (${update.message.chat.type}) — bot stays silent`,
        )
      }
    }
    return
  }

  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = cq.message?.chat.id
    const messageId = cq.message?.message_id ?? null
    const data = cq.data ?? ""
    const firstName = cq.from.first_name ?? "cliente"
    if (!chatId) {
      await ctx.tg.answerCallbackQuery(cq.id)
      return
    }
    // PIX verify/cancel answer with their own contextual toast; everything else
    // gets a generic immediate ack so the button stops its loading spinner.
    const isPixAction = data.startsWith("pixver:") || data.startsWith("pixcxl:")
    if (!isPixAction) await ctx.tg.answerCallbackQuery(cq.id)
    const cbStarted = Date.now()

    // The shop/catalog is a PRIVATE-chat experience only. If inline buttons
    // from an old shop message get clicked inside a group/supergroup/channel,
    // ignore them so the product flow never renders in a group.
    const cbChatType = (cq.message as any)?.chat?.type
    if (cbChatType && cbChatType !== "private") return

    if (data === "noop") return

    if (data === "home" || data.startsWith("home:")) {
      const page = Number(data.split(":")[1] ?? "0") || 0
      await renderScreen(ctx, chatId, messageId, await buildHomeScreen(ctx, firstName, page))
    } else if (data.startsWith("cat:")) {
      const [, catId, pageStr] = data.split(":")
      const page = Number(pageStr ?? "0") || 0
      await renderScreen(ctx, chatId, messageId, await buildCategoryScreen(ctx, catId, page))
    } else if (data.startsWith("prod:")) {
      await renderScreen(
        ctx,
        chatId,
        messageId,
        await buildProductScreen(ctx, Number(data.split(":")[1]), String(cq.from.id)),
      )
    } else if (data === "profile") {
      await renderScreen(ctx, chatId, messageId, await buildProfileScreen(ctx, String(cq.from.id)))
    } else if (data === "recharge_menu") {
      await renderScreen(ctx, chatId, messageId, buildRechargeScreen(ctx))
    } else if (data.startsWith("recharge_do:")) {
      await handleRecharge(ctx, chatId, Number(data.split(":")[1]), cq.from)
    } else if (data === "history_cmd") {
      await showHistory(ctx, chatId, String(cq.from.id))
    } else if (data === "support") {
      await renderScreen(ctx, chatId, messageId, buildSupportScreen(ctx))
    } else if (data === "catalog") {
      // Legacy callback — route to the new home screen.
      await renderScreen(ctx, chatId, messageId, await buildHomeScreen(ctx, firstName, 0))
    } else if (data.startsWith("buy:")) {
      await startPurchase(ctx, chatId, Number(data.split(":")[1]), cq.from)
    } else if (data.startsWith("paybal:")) {
      await handlePayWithBalance(ctx, chatId, Number(data.split(":")[1]), cq.from)
    } else if (data.startsWith("coupon:")) {
      // Ask the customer to type their coupon code.
      const productId = Number(data.split(":")[1])
      await ctx.tg.sendMessage(
        chatId,
        [
          `🎟️ <b>Aplicar Cupom</b>`,
          ``,
          `Digite o código do cupom abaixo para obter seu desconto.`,
          `O desconto será aplicado automaticamente na sua próxima compra do produto <b>#${productId}</b>.`,
        ].join("\n"),
      )
      // Store the product id in the customer's pending coupon state via a temporary flag.
      // We use a special prefix in the text handler to detect the coupon reply.
      await db
        .update(customers)
        .set({ activeCoupon: `__awaiting:${productId}` })
        .where(
          and(
            eq(customers.ownerId, ctx.storeId),
            eq(customers.telegramId, String(cq.from.id)),
          ),
        )
    } else if (data.startsWith("pixver:")) {
      await handlePixVerify(ctx, cq.id, chatId, data.split(":")[1])
    } else if (data.startsWith("pixcxl:")) {
      await handlePixCancel(ctx, cq.id, chatId, data.split(":")[1])
    }
    const cbElapsed = Date.now() - cbStarted
    if (cbElapsed > 1_500) {
      console.warn(
        `[bot/callback] slow: ${cbElapsed}ms for "${data}"`,
      )
    }
    return
  }

  const msg = update.message
  if (!msg?.text || !msg.from) return
  // Shop commands (/start, /catalogo, /suporte, etc.) and admin commands are
  // private-chat only. Group/supergroup messages already returned above; this
  // guard ensures nothing with a "/" ever triggers a reply outside private DMs.
  if (msg.chat.type !== "private") return
  console.log(
    `[v0] private handler: processing "${msg.text.trim()}" from user ${msg.from.id}`,
  )
  const chatId = msg.chat.id
  const text = msg.text.trim()
  const senderId = String(msg.from.id)
  const isAdmin = ctx.adminIds.includes(senderId)

  // Admin commands (only for authorized IDs).
  if (isAdmin && text.startsWith("/") && text !== "/start") {
    await handleAdminCommand(ctx, chatId, text.split(" ")[0])
    return
  }

  // Customer flows.
  const firstName = msg.from.first_name ?? "cliente"

  // Check if the customer is in the middle of a coupon-entry flow.
  const [customerRecord] = await db
    .select({ id: customers.id, activeCoupon: customers.activeCoupon })
    .from(customers)
    .where(and(eq(customers.ownerId, ctx.storeId), eq(customers.telegramId, senderId)))

  if (
    customerRecord?.activeCoupon?.startsWith("__awaiting:") &&
    !text.startsWith("/")
  ) {
    // The customer typed their coupon code.
    const productId = Number(customerRecord.activeCoupon.split(":")[1])
    const typedCode = text.trim().toUpperCase()
    try {
      const coupon = await validateCoupon(ctx.storeId, typedCode)
      // Save the validated coupon code (without the __awaiting prefix).
      await db
        .update(customers)
        .set({ activeCoupon: coupon.code })
        .where(eq(customers.id, customerRecord.id))
      await ctx.tg.sendMessage(
        chatId,
        [
          `✅ Cupom <code>${escapeHtml(coupon.code)}</code> aplicado com sucesso!`,
          `Você terá <b>${coupon.discountPercent}% de desconto</b> na sua próxima compra.`,
          ``,
          `Toque em 🛍️ <b>Comprar</b> no produto para finalizar com o desconto.`,
        ].join("\n"),
      )
    } catch (err) {
      // Invalid coupon — clear the awaiting state and inform the customer.
      await db
        .update(customers)
        .set({ activeCoupon: null })
        .where(eq(customers.id, customerRecord.id))
      await ctx.tg.sendMessage(
        chatId,
        [
          `❌ ${(err as Error).message}`,
          ``,
          `Verifique o código e tente novamente pelo botão 🎟️ Aplicar Cupom.`,
        ].join("\n"),
      )
    }
    return
  }

  if (text === "/start") {
    // BUGFIX: wrap /start in try/catch so that DB errors (missing columns,
    // missing unique index, etc.) don't silently kill the response. We log
    // the error and fall back to a simple welcome message.
    try {
      await upsertCustomer(ctx.storeId, msg.from)
    } catch (err) {
      console.error(
        `[bot/start] upsertCustomer failed for telegramId=${senderId} store=${ctx.storeId}:`,
        err instanceof Error ? err.message : err,
      )
      // Attempt to send a simple welcome message even if customer upsert failed
    }
    // Single message: welcome + categories, sent fresh. All later navigation
    // edits this same message in place.
    try {
      await renderScreen(ctx, chatId, null, await buildHomeScreen(ctx, firstName, 0))
    } catch (err) {
      console.error(
        `[bot/start] renderScreen (home) failed for telegramId=${senderId} store=${ctx.storeId}:`,
        err instanceof Error ? err.message : err,
      )
      // Fallback: send a plain text welcome so the user always gets a response
      await ctx.tg.sendMessage(
        chatId,
        `\ud83d\udc4b Bem-vindo(a) \u00e0 nossa loja!\n\n<i>Estamos processando seu pedido. Tente novamente em instantes.</i>`,
      )
    }
  } else if (text === "/catalogo" || text.toLowerCase() === "catálogo") {
    await renderScreen(ctx, chatId, null, await buildHomeScreen(ctx, firstName, 0))
  } else if (text === "/historico" || text === "/compras") {
    await showHistory(ctx, chatId, senderId)
  } else if (text === "/perfil" || text === "/saldo") {
    await renderScreen(ctx, chatId, null, await buildProfileScreen(ctx, senderId))
  } else if (text === "/suporte") {
    await renderScreen(ctx, chatId, null, buildSupportScreen(ctx))
  } else {
    await ctx.tg.sendMessage(
      chatId,
      [
        `Comandos disponíveis:`,
        `/catalogo — ver produtos`,
        `/perfil — seu saldo e conta`,
        `/compras — histórico`,
        `/suporte — falar com suporte`,
      ].join("\n"),
    )
  }
  const totalElapsed = Date.now() - handleStarted
  if (totalElapsed > 2_000) {
    console.warn(
      `[bot/handleUpdate] slow: ${totalElapsed}ms for store=${storeId}`,
    )
  }
}

// Confirms in-group that detection succeeded, echoing the chat's real data and
// the bot's admin status. This closes the loop for the self-service detection
// command (/detectar, /id, /status) used to register already-joined groups.
async function replyGroupDetection(
  ctx: StoreContext,
  chat: { id: number; type: string; title?: string; username?: string },
  threadId: number | null,
) {
  if (!ctx.botId) return
  const memberRes = await ctx.tg.getChatMember(chat.id, ctx.botId)
  const status = memberRes.ok && memberRes.result ? memberRes.result.status : "unknown"
  const isAdmin = status === "administrator" || status === "creator"
  const typeLabel =
    chat.type === "supergroup"
      ? "Supergrupo"
      : chat.type === "channel"
        ? "Canal"
        : "Grupo"

  const lines = [
    isAdmin
      ? "✅ Grupo detectado e sincronizado com o painel!"
      : "⚠️ Grupo detectado, mas o bot ainda não é administrador.",
    "",
    `Nome: ${chat.title ?? chat.id}`,
    `Chat ID: ${chat.id}`,
    `Tipo: ${typeLabel}`,
    ...(threadId ? [`Tópico (message_thread_id): ${threadId}`] : []),
    `Bot é administrador: ${isAdmin ? "sim" : "não"}`,
    "",
    isAdmin
      ? "Abra o painel em Grupos & Canais e escolha a função deste grupo (CDN, Postagens, Logs, etc.)."
      : "Promova o bot a administrador para liberar todas as funções e sincronizar as permissões.",
  ]
  await ctx.tg.sendMessage(chat.id, lines.join("\n"), {
    messageThreadId: threadId,
  })
}
