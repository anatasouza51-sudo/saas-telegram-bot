import { db } from "@/lib/db"
import {
  products,
  customers,
  orders,
  deliveries,
} from "@/lib/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import {
  sendMessage,
  sendPhoto,
  answerCallbackQuery,
  buildInlineKeyboard,
  type TelegramUpdate,
} from "@/lib/telegram"
import { getSetting } from "@/app/actions/settings"
import { createCharge } from "@/lib/veopag"
import { formatCurrency } from "@/lib/format"

async function getAdminIds(): Promise<string[]> {
  const raw = (await getSetting("telegram.adminIds")) ?? ""
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function upsertCustomer(from: {
  id: number
  username?: string
  first_name?: string
}) {
  const telegramId = String(from.id)
  const [existing] = await db
    .select()
    .from(customers)
    .where(eq(customers.telegramId, telegramId))
  if (existing) return existing
  const [created] = await db
    .insert(customers)
    .values({
      telegramId,
      username: from.username ?? null,
      name: from.first_name ?? null,
      status: "active",
    })
    .returning()
  return created
}

// ---------- Customer bot ----------

async function showCatalog(chatId: number) {
  const items = await db
    .select()
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(desc(products.createdAt))

  if (items.length === 0) {
    await sendMessage(chatId, "Nenhum produto disponível no momento.")
    return
  }

  await sendMessage(chatId, "<b>🛒 Catálogo</b>\nEscolha um produto:", {
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

async function showProduct(chatId: number, productId: number) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
  if (!product) {
    await sendMessage(chatId, "Produto não encontrado.")
    return
  }

  const available = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(sql`stock_items`)
    .where(sql`"productId" = ${productId} AND status = 'available'`)

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
    await sendPhoto(chatId, product.imageUrl, caption, keyboard)
  } else {
    await sendMessage(chatId, caption, { replyMarkup: keyboard })
  }
}

async function startPurchase(
  chatId: number,
  productId: number,
  from: { id: number; username?: string; first_name?: string },
) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
  if (!product) return

  const customer = await upsertCustomer(from)

  const [order] = await db
    .insert(orders)
    .values({
      customerId: customer.id,
      productId: product.id,
      productName: product.name,
      amount: product.price,
      paymentStatus: "pending",
      deliveryStatus: "pending",
      gateway: "veopag",
    })
    .returning()

  const charge = await createCharge({
    amount: Number(product.price),
    externalId: String(order.id),
    description: product.name,
    customerName: customer.name ?? undefined,
  })

  if (!charge.ok) {
    await sendMessage(
      chatId,
      `⚠️ Não foi possível gerar o pagamento agora.\n<code>${charge.error}</code>\n\nO pedido #${order.id} ficou pendente.`,
    )
    return
  }

  await db
    .update(orders)
    .set({ paymentId: charge.paymentId })
    .where(eq(orders.id, order.id))

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

  await sendMessage(chatId, lines.join("\n"), { replyMarkup: keyboard })
}

async function showHistory(chatId: number, telegramId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.telegramId, telegramId))
  if (!customer) {
    await sendMessage(chatId, "Você ainda não tem compras.")
    return
  }
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customer.id))
    .orderBy(desc(orders.createdAt))
    .limit(10)

  if (rows.length === 0) {
    await sendMessage(chatId, "Você ainda não tem compras.")
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
  await sendMessage(chatId, text)
}

// ---------- Admin bot ----------

async function handleAdminCommand(chatId: number, command: string) {
  switch (command) {
    case "/dashboard": {
      const [rev] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(${orders.amount}) FILTER (WHERE ${orders.paymentStatus} = 'approved'), 0)`,
          sales: sql<number>`COUNT(*) FILTER (WHERE ${orders.paymentStatus} = 'approved')::int`,
          pending: sql<number>`COUNT(*) FILTER (WHERE ${orders.paymentStatus} = 'pending')::int`,
        })
        .from(orders)
      await sendMessage(
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
      const rows = await db.select().from(products).orderBy(desc(products.createdAt)).limit(15)
      await sendMessage(
        chatId,
        [`<b>📦 Produtos</b>`, ...rows.map((p) => `#${p.id} ${p.name} — ${formatCurrency(Number(p.price))} (${p.status})`)].join("\n"),
      )
      break
    }
    case "/orders": {
      const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10)
      await sendMessage(
        chatId,
        [`<b>🧾 Últimos pedidos</b>`, ...rows.map((o) => `#${o.id} ${o.productName} — ${o.paymentStatus}/${o.deliveryStatus}`)].join("\n"),
      )
      break
    }
    case "/customers": {
      const [c] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(customers)
      await sendMessage(chatId, `👥 Total de clientes: <b>${c.count}</b>`)
      break
    }
    case "/statistics": {
      const [d] = await db
        .select({
          delivered: sql<number>`COUNT(*)::int`,
        })
        .from(deliveries)
      await sendMessage(chatId, `📈 Entregas realizadas: <b>${d.delivered}</b>`)
      break
    }
    default:
      await sendMessage(
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

export async function handleUpdate(update: TelegramUpdate) {
  const adminIds = await getAdminIds()

  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = cq.message?.chat.id
    const data = cq.data ?? ""
    await answerCallbackQuery(cq.id)
    if (!chatId) return

    if (data === "catalog") await showCatalog(chatId)
    else if (data.startsWith("product:"))
      await showProduct(chatId, Number(data.split(":")[1]))
    else if (data.startsWith("buy:"))
      await startPurchase(chatId, Number(data.split(":")[1]), cq.from)
    return
  }

  const msg = update.message
  if (!msg?.text || !msg.from) return
  const chatId = msg.chat.id
  const text = msg.text.trim()
  const senderId = String(msg.from.id)
  const isAdmin = adminIds.includes(senderId)

  // Admin commands (only for authorized IDs).
  if (isAdmin && text.startsWith("/") && text !== "/start") {
    await handleAdminCommand(chatId, text.split(" ")[0])
    return
  }

  // Customer flows.
  if (text === "/start") {
    await upsertCustomer(msg.from)
    await sendMessage(
      chatId,
      [
        `👋 Bem-vindo(a) à nossa loja!`,
        ``,
        `Use os botões abaixo para navegar.`,
      ].join("\n"),
      {
        replyMarkup: buildInlineKeyboard([
          [{ text: "🛒 Ver catálogo", callback_data: "catalog" }],
        ]),
      },
    )
  } else if (text === "/catalogo" || text.toLowerCase() === "catálogo") {
    await showCatalog(chatId)
  } else if (text === "/historico" || text === "/compras") {
    await showHistory(chatId, senderId)
  } else if (text === "/suporte") {
    await sendMessage(
      chatId,
      "💬 Descreva sua dúvida e nossa equipe entrará em contato. Você também pode falar diretamente com o suporte.",
    )
  } else {
    await sendMessage(
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
