import { db } from "@/lib/db"
import { products, customers, orders, deliveries, settings } from "@/lib/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import {
  TelegramClient,
  buildInlineKeyboard,
  type TelegramUpdate,
} from "@/lib/telegram"
import { createCharge, type VeoPagCredentials } from "@/lib/veopag"
import { formatCurrency } from "@/lib/format"
import { getAppBaseUrl } from "@/lib/urls"

// Everything the router needs for one store, loaded once per update.
type StoreContext = {
  storeId: string
  tg: TelegramClient
  adminIds: string[]
  veopag: VeoPagCredentials
  welcomeMessage: string
  welcomeImageUrl: string
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
    adminIds,
    veopag: {
      publicKey: map["veopag.publicKey"] ?? "",
      secretKey: map["veopag.secretKey"] ?? "",
    },
    welcomeMessage: map["store.welcomeMessage"] ?? "",
    welcomeImageUrl: map["store.welcomeImageUrl"] ?? "",
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

// ---------- Customer bot ----------

async function showCatalog(ctx: StoreContext, chatId: number) {
  const items = await db
    .select()
    .from(products)
    .where(and(eq(products.ownerId, ctx.storeId), eq(products.status, "active")))
    .orderBy(desc(products.createdAt))

  if (items.length === 0) {
    await ctx.tg.sendMessage(chatId, "Nenhum produto disponível no momento.")
    return
  }

  await ctx.tg.sendMessage(chatId, "<b>🛒 Catálogo</b>\nEscolha um produto:", {
    replyMarkup: buildInlineKeyboard(
      items.map((p) => [
        {
          text: `${p.name} — ${formatCurrency(Number(p.price))}`,
          callback_data: `product:${p.id}`,
        },
      ]),
    ),
  })
}

async function showProduct(ctx: StoreContext, chatId: number, productId: number) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.ownerId, ctx.storeId), eq(products.id, productId)))
  if (!product) {
    await ctx.tg.sendMessage(chatId, "Produto não encontrado.")
    return
  }

  const available = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(sql`stock_items`)
    .where(
      sql`"productId" = ${productId} AND "ownerId" = ${ctx.storeId} AND status = 'available'`,
    )

  const inStock = Number(available[0]?.count ?? 0) > 0
  const caption = [
    `<b>${product.name}</b>`,
    ``,
    product.description ?? "",
    ``,
    `💰 <b>${formatCurrency(Number(product.price))}</b>`,
    inStock ? "✅ Em estoque" : "⛔ Esgotado",
  ].join("\n")

  const keyboard = buildInlineKeyboard(
    inStock
      ? [[{ text: "🛍️ Comprar", callback_data: `buy:${product.id}` }]]
      : [[{ text: "⬅️ Voltar ao catálogo", callback_data: "catalog" }]],
  )

  if (product.imageUrl) {
    await ctx.tg.sendPhoto(chatId, product.imageUrl, caption, keyboard)
  } else {
    await ctx.tg.sendMessage(chatId, caption, { replyMarkup: keyboard })
  }
}

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

  const charge = await createCharge(ctx.veopag, {
    amount: Number(product.price),
    externalId: String(order.id),
    description: product.name,
    customerName: customer.name ?? undefined,
    callbackUrl: `${getAppBaseUrl()}/api/veopag/webhook/${ctx.storeId}`,
    payer: {
      name: customer.name ?? customer.username ?? "Cliente",
    },
  })

  if (!charge.ok) {
    await ctx.tg.sendMessage(
      chatId,
      `⚠️ Não foi possível gerar o pagamento agora.\n<code>${charge.error}</code>\n\nO pedido #${order.id} ficou pendente.`,
    )
    return
  }

  await db
    .update(orders)
    .set({ paymentId: charge.paymentId })
    .where(and(eq(orders.ownerId, ctx.storeId), eq(orders.id, order.id)))

  const lines = [
    `<b>Pedido #${order.id}</b> criado!`,
    `Produto: <b>${product.name}</b>`,
    `Valor: <b>${formatCurrency(Number(product.price))}</b>`,
    ``,
    `Pague via PIX para receber o produto automaticamente:`,
  ]
  if (charge.pixCode) {
    lines.push("", `<code>${charge.pixCode}</code>`)
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
        `#${o.id} — ${o.productName} — ${formatCurrency(Number(o.amount))} — ${
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
            (p) => `#${p.id} ${p.name} — ${formatCurrency(Number(p.price))} (${p.status})`,
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
            (o) => `#${o.id} ${o.productName} — ${o.paymentStatus}/${o.deliveryStatus}`,
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

  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = cq.message?.chat.id
    const data = cq.data ?? ""
    await ctx.tg.answerCallbackQuery(cq.id)
    if (!chatId) return

    if (data === "catalog") await showCatalog(ctx, chatId)
    else if (data.startsWith("product:"))
      await showProduct(ctx, chatId, Number(data.split(":")[1]))
    else if (data.startsWith("buy:"))
      await startPurchase(ctx, chatId, Number(data.split(":")[1]), cq.from)
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
  if (text === "/start") {
    await upsertCustomer(ctx.storeId, msg.from)
    const firstName = msg.from.first_name ?? "cliente"
    // Store owners can customize this via the panel; {nome} is replaced with
    // the customer's first name. Falls back to a friendly default.
    const welcome = (
      ctx.welcomeMessage.trim() ||
      "👋 Bem-vindo(a) à nossa loja!\n\nConfira nossos produtos abaixo:"
    ).replace(/\{nome\}/gi, firstName)

    if (ctx.welcomeImageUrl.trim()) {
      await ctx.tg.sendPhoto(chatId, ctx.welcomeImageUrl.trim(), welcome)
    } else {
      await ctx.tg.sendMessage(chatId, welcome)
    }
    // Show the catalog immediately so the first screen is actionable.
    await showCatalog(ctx, chatId)
  } else if (text === "/catalogo" || text.toLowerCase() === "catálogo") {
    await showCatalog(ctx, chatId)
  } else if (text === "/historico" || text === "/compras") {
    await showHistory(ctx, chatId, senderId)
  } else if (text === "/suporte") {
    await ctx.tg.sendMessage(
      chatId,
      "💬 Descreva sua dúvida e nossa equipe entrará em contato.",
    )
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
