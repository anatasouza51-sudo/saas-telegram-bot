import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  numeric,
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
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("categoryId"),
  imageUrl: text("imageUrl"),
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

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  ownerId: text("ownerId").notNull(),
  key: text("key").notNull(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

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
