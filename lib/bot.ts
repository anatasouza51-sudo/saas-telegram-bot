import { db } from "@/lib/db"
import {
  products,
  categories,
  customers,
  orders,
  deliveries,
  settings,
  stockItems,
} from "@/lib/db/schema"
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"
import {
  TelegramClient,
  buildInlineKeyboard,
  type TelegramUpdate,
} from "@/lib/telegram"
import { createCharge, type VeoPagCredentials } from "@/lib/veopag"
import { formatCurrency } from "@/lib/format"
import { getAppBaseUrl } from "@/lib/urls"
import { getOrCreateWebhookSecret } from "@/lib/webhook-secrets"
import { escapeHtml } from "@/lib/security"
import { handleMyChatMember, detectChatFromUpdate } from "@/lib/tg/discovery"
import { botIdFromToken } from "@/lib/tg/config"

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
  veopag: VeoPagCredentials
  welcomeMessage: string
  welcomeImageUrl: string
  support: SupportConfig
}

type InlineButton = { text: string; callback_data?: string; url?: string }

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

  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value ?? ""

  const token = map["telegram.botToken"]
  if (!token) return null

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
  }
}

async function upsertCustomer(
  storeId: string,
  from: { id: number; username?: string; first_name?: string },
) {
  const telegramId = String(from.id)
  const [existing] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.ownerId, storeId), eq(customers.telegramId, telegramId)))
  if (existing) return existing
  const [created] = await db
    .insert(customers)
    .values({
      ownerId: storeId,
      telegramId,
      username: from.username ?? null,
      name: from.first_name ?? null,
      status: "active",
    })
    .returning()
  return created
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
      await ctx.tg.sendPhoto(chatId, image, screen.text, screen.keyboard)
    } else {
      await ctx.tg.sendMessage(chatId, screen.text, { replyMarkup: screen.keyboard })
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
  ).replace(/\{nome\}/gi, firstName)

  const rows: InlineButton[][] = slice.map((e) => [
    { text: e.label, callback_data: `cat:${e.id}:0` },
  ])

  const nav = pageNav("home:", safePage, totalPages)
  if (nav.length) rows.push(nav)

  if (ctx.support.enabled) {
    rows.push([{ text: ctx.support.label, callback_data: "support" }])
  }

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
          [{ text: "⬅️ Voltar", callback_data: "home:0" }],
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

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(0, page), totalPages - 1)
  const slice = items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const rows: InlineButton[][] = slice.map((p) => [
    {
      text: `${p.name} — ${formatCurrency(Number(p.price))}`,
      callback_data: `prod:${p.id}`,
    },
  ])

  const nav = pageNav(`cat:${catId}:`, safePage, totalPages)
  if (nav.length) rows.push(nav)
  rows.push([{ text: "⬅️ Voltar", callback_data: "home:0" }])

  const parts = [`<b>${title}</b>`]
  if (description) parts.push("", description)
  parts.push(
    "",
    items.length === 0 ? "<i>Nenhum produto disponível.</i>" : "Escolha um produto:",
  )

  return {
    imageUrl,
    text: parts.join("\n"),
    keyboard: buildInlineKeyboard(rows),
  }
}

async function buildProductScreen(
  ctx: StoreContext,
  productId: number,
): Promise<Screen> {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.ownerId, ctx.storeId), eq(products.id, productId)))

  if (!product) {
    return {
      text: "Produto não encontrado.",
      keyboard: buildInlineKeyboard([
        [{ text: "⬅️ Voltar", callback_data: "home:0" }],
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
        ? "✅ Em estoque"
        : "⛔ Esgotado"
      : "✅ Disponível",
  ]
    .filter(Boolean)
    .join("\n")

  const backCat = product.categoryId != null ? String(product.categoryId) : UNCATEGORIZED
  const rows: InlineButton[][] = []
  if (inStock) {
    rows.push([{ text: "🛍️ Comprar", callback_data: `buy:${product.id}` }])
  }
  rows.push([{ text: "⬅️ Voltar", callback_data: `cat:${backCat}:0` }])

  return {
    imageUrl: product.imageUrl,
    text: caption,
    keyboard: buildInlineKeyboard(rows),
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
  rows.push([{ text: "⬅️ Voltar", callback_data: "home:0" }])

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
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.ownerId, ctx.storeId), eq(products.id, productId)))
  if (!product) return

  const customer = await upsertCustomer(ctx.storeId, from)

  const [order] = await db
    .insert(orders)
    .values({
      ownerId: ctx.storeId,
      customerId: customer.id,
      productId: product.id,
      productName: product.name,
      amount: product.price,
      paymentStatus: "pending",
      deliveryStatus: "pending",
      gateway: "veopag",
    })
    .returning()

  const webhookSecret = await getOrCreateWebhookSecret(ctx.storeId, "veopag")
  const charge = await createCharge(ctx.veopag, {
    amount: Number(product.price),
    externalId: String(order.id),
    description: product.name,
    customerName: customer.name ?? undefined,
    callbackUrl: `${getAppBaseUrl()}/api/veopag/webhook/${ctx.storeId}/${webhookSecret}`,
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

  await db
    .update(orders)
    .set({ paymentId: charge.paymentId })
    .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, order.id)))

  const lines = [
    `<b>Pedido #${order.id}</b> criado!`,
    `Produto: <b>${escapeHtml(product.name)}</b>`,
    `Valor: <b>${formatCurrency(Number(product.price))}</b>`,
    ``,
    `Pague via PIX para receber o produto automaticamente:`,
  ]
  if (charge.pixCode) {
    lines.push("", `<code>${escapeHtml(charge.pixCode)}</code>`)
  }

  const keyboard = charge.checkoutUrl
    ? buildInlineKeyboard([[{ text: "💳 Abrir checkout", url: charge.checkoutUrl }]])
    : undefined

  await ctx.tg.sendMessage(chatId, lines.join("\n"), { replyMarkup: keyboard })
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

  // Messages from a group/supergroup are NEVER the private customer shop flow.
  // They serve two purposes: (1) passively prove the bot is a member so we can
  // auto-detect the chat, and (2) let an admin force detection by sending a
  // command inside the group. Commands reach the bot even with privacy mode ON,
  // which is the ONLY reliable way to register a group the bot already joined.
  if (
    update.message &&
    (update.message.chat.type === "group" ||
      update.message.chat.type === "supergroup")
  ) {
    if (ctx.botId) {
      await detectChatFromUpdate(
        storeId,
        update.message.chat,
        ctx.botId,
        ctx.tg,
      )
      const cmd = (update.message.text ?? "")
        .trim()
        .toLowerCase()
        .split("@")[0]
      if (["/detectar", "/id", "/start", "/status"].includes(cmd)) {
        await replyGroupDetection(ctx, update.message.chat)
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
    await ctx.tg.answerCallbackQuery(cq.id)
    if (!chatId) return

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
        await buildProductScreen(ctx, Number(data.split(":")[1])),
      )
    } else if (data === "support") {
      await renderScreen(ctx, chatId, messageId, buildSupportScreen(ctx))
    } else if (data === "catalog") {
      // Legacy callback — route to the new home screen.
      await renderScreen(ctx, chatId, messageId, await buildHomeScreen(ctx, firstName, 0))
    } else if (data.startsWith("buy:")) {
      await startPurchase(ctx, chatId, Number(data.split(":")[1]), cq.from)
    }
    return
  }

  const msg = update.message
  if (!msg?.text || !msg.from) return
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
  if (text === "/start") {
    await upsertCustomer(ctx.storeId, msg.from)
    // Single message: welcome + categories, sent fresh. All later navigation
    // edits this same message in place.
    await renderScreen(ctx, chatId, null, await buildHomeScreen(ctx, firstName, 0))
  } else if (text === "/catalogo" || text.toLowerCase() === "catálogo") {
    await renderScreen(ctx, chatId, null, await buildHomeScreen(ctx, firstName, 0))
  } else if (text === "/historico" || text === "/compras") {
    await showHistory(ctx, chatId, senderId)
  } else if (text === "/suporte") {
    await renderScreen(ctx, chatId, null, buildSupportScreen(ctx))
  } else {
    await ctx.tg.sendMessage(
      chatId,
      [
        `Comandos disponíveis:`,
        `/catalogo — ver produtos`,
        `/compras — histórico`,
        `/suporte — falar com suporte`,
      ].join("\n"),
    )
  }
}

// Confirms in-group that detection succeeded, echoing the chat's real data and
// the bot's admin status. This closes the loop for the self-service detection
// command (/detectar, /id, /status) used to register already-joined groups.
async function replyGroupDetection(
  ctx: StoreContext,
  chat: { id: number; type: string; title?: string; username?: string },
) {
  if (!ctx.botId) return
  const memberRes = await ctx.tg.getChatMember(chat.id, ctx.botId)
  const status = memberRes.ok ? memberRes.result.status : "unknown"
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
    `Bot é administrador: ${isAdmin ? "sim" : "não"}`,
    "",
    isAdmin
      ? "Abra o painel em Grupos & Canais e escolha a função deste grupo (CDN, Postagens, Logs, etc.)."
      : "Promova o bot a administrador para liberar todas as funções e sincronizar as permissões.",
  ]
  await ctx.tg.sendMessage(chat.id, lines.join("\n"))
}
