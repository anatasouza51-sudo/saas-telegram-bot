import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core"

/* ---------------------------------------------------------------------------
 * Better Auth tables (do NOT rename columns — these match Better Auth defaults)
 * ------------------------------------------------------------------------- */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  // Application role: admin | products | finance | support
  role: text("role").notNull().default("support"),
  // Store owner. NULL means this user IS the store owner (self-owned tenant).
  // Team members inherit their owner's id here.
  ownerId: text("ownerId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

/* ---------------------------------------------------------------------------
 * Application tables
 * ------------------------------------------------------------------------- */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  emoji: text("emoji"),
  imageUrl: text("imageUrl"),
  // Display order in the Telegram catalog (ascending).
  position: integer("position").notNull().default(0),
  // active | inactive
  status: text("status").notNull().default("active"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("categoryId"),
  imageUrl: text("imageUrl"),
  // Display order within its category in the Telegram catalog (ascending).
  position: integer("position").notNull().default(0),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  // active | inactive
  status: text("status").notNull().default("active"),
  // stock | manual
  deliveryType: text("deliveryType").notNull().default("stock"),
  lowStockThreshold: integer("lowStockThreshold").notNull().default(5),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const stockItems = pgTable("stock_items", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  productId: integer("productId").notNull(),
  content: text("content").notNull(),
  // available | reserved | sold
  status: text("status").notNull().default("available"),
  orderId: integer("orderId"),
  soldAt: timestamp("soldAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  telegramId: text("telegramId").notNull(),
  username: text("username"),
  name: text("name"),
  totalSpent: numeric("totalSpent", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  purchaseCount: integer("purchaseCount").notNull().default(0),
  lastPurchaseAt: timestamp("lastPurchaseAt"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  customerId: integer("customerId"),
  productId: integer("productId"),
  productName: text("productName"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  // pending | approved | refused | cancelled
  paymentStatus: text("paymentStatus").notNull().default("pending"),
  // pending | delivered | cancelled
  deliveryStatus: text("deliveryStatus").notNull().default("pending"),
  gateway: text("gateway").notNull().default("veopag"),
  paymentId: text("paymentId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId"),
  customerId: integer("customerId"),
  stockItemId: integer("stockItemId"),
  deliveredContent: text("deliveredContent"),
  status: text("status").notNull().default("delivered"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    ownerId: text("ownerId").notNull(),
    key: text("key").notNull(),
    value: text("value"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    ownerKeyUnique: uniqueIndex("settings_owner_key_uidx").on(t.ownerId, t.key),
  }),
)

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  actorId: text("actorId"),
  actorName: text("actorName"),
  action: text("action").notNull(),
  category: text("category").notNull().default("system"),
  details: text("details"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

/* ---------------------------------------------------------------------------
 * Telegram posting module
 * ------------------------------------------------------------------------- */

// Unified table for groups and channels. `purpose` distinguishes normal
// audience destinations from the private CDN store and the management group.
export const telegramChats = pgTable(
  "telegram_chats",
  {
    id: serial("id").primaryKey(),
    ownerId: text("ownerId").notNull(),
    title: text("title").notNull(),
    chatId: text("chatId").notNull(),
    username: text("username"),
    // group | supergroup | channel
    type: text("type").notNull().default("group"),
    description: text("description"),
    // active | inactive
    status: text("status").notNull().default("active"),
    botIsAdmin: boolean("botIsAdmin").notNull().default(false),
    // JSON array of missing admin permissions when the bot is not fully set up
    missingPermissions: text("missingPermissions"),
    // audience | cdn | management
    purpose: text("purpose").notNull().default("audience"),
    lastSyncedAt: timestamp("lastSyncedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    ownerChatUnique: uniqueIndex("telegram_chats_owner_chatid_uidx").on(
      t.ownerId,
      t.chatId,
    ),
  }),
)

export const telegramMediaFolders = pgTable("telegram_media_folders", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  name: text("name").notNull(),
  parentId: integer("parentId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Media stored on Telegram's own infrastructure. We only persist the file_id
// (per-bot reusable handle) and metadata — never a public URL.
export const telegramMedia = pgTable(
  "telegram_media",
  {
    id: serial("id").primaryKey(),
    ownerId: text("ownerId").notNull(),
    folderId: integer("folderId"),
    fileId: text("fileId").notNull(),
    fileUniqueId: text("fileUniqueId"),
    // photo | video | animation | document | audio | sticker
    type: text("type").notNull().default("photo"),
    fileName: text("fileName"),
    mimeType: text("mimeType"),
    fileSize: integer("fileSize"),
    width: integer("width"),
    height: integer("height"),
    duration: integer("duration"),
    thumbFileId: text("thumbFileId"),
    caption: text("caption"),
    uploadedBy: text("uploadedBy"),
    uploadedByName: text("uploadedByName"),
    usageCount: integer("usageCount").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    ownerUniqueFile: uniqueIndex("telegram_media_owner_uniqueid_uidx").on(
      t.ownerId,
      t.fileUniqueId,
    ),
  }),
)

export const telegramTemplates = pgTable("telegram_templates", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("geral"),
  text: text("text"),
  parseMode: text("parseMode").notNull().default("HTML"),
  // JSON array of media ids
  mediaIds: text("mediaIds"),
  // JSON array of button rows
  buttons: text("buttons"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const telegramPosts = pgTable("telegram_posts", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  title: text("title"),
  text: text("text"),
  parseMode: text("parseMode").notNull().default("HTML"),
  // JSON array of media ids (references telegram_media.id)
  mediaIds: text("mediaIds"),
  // JSON array of button rows: [[{text,type,value}]]
  buttons: text("buttons"),
  // draft | scheduled | queued | sent | failed | cancelled
  status: text("status").notNull().default("draft"),
  createdBy: text("createdBy"),
  createdByName: text("createdByName"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const telegramSchedules = pgTable("telegram_schedules", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  postId: integer("postId").notNull(),
  // JSON: array of chat ids, or tokens "all_groups" | "all_channels" | "all"
  targets: text("targets").notNull(),
  // now | once | recurring
  scheduleType: text("scheduleType").notNull().default("now"),
  runAt: timestamp("runAt"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  // JSON recurrence config
  recurrence: text("recurrence"),
  nextRunAt: timestamp("nextRunAt"),
  lastRunAt: timestamp("lastRunAt"),
  active: boolean("active").notNull().default(true),
  createdBy: text("createdBy"),
  createdByName: text("createdByName"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const telegramQueue = pgTable("telegram_queue", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  postId: integer("postId").notNull(),
  scheduleId: integer("scheduleId"),
  chatId: text("chatId").notNull(),
  // pending | processing | sent | failed
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("maxAttempts").notNull().default(5),
  lastError: text("lastError"),
  scheduledFor: timestamp("scheduledFor").notNull().defaultNow(),
  sentMessageId: integer("sentMessageId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const telegramAutomations = pgTable("telegram_automations", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  name: text("name").notNull(),
  // product_created | stock_restocked | product_unavailable | promo_created
  trigger: text("trigger").notNull(),
  templateId: integer("templateId"),
  customText: text("customText"),
  // JSON targets (same format as schedules)
  targets: text("targets").notNull(),
  active: boolean("active").notNull().default(true),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
