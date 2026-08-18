import "server-only"

import { and, desc, eq, isNull, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { customers, orders, products, user } from "@/lib/db/schema"
import { withTenantTx } from "@/lib/db/tenant-tx"
import { getPlatformMisticPayConfig } from "@/lib/platform-settings"
import { PLATFORM_ADMIN_EMAIL } from "@/lib/platform-admin"

const MAX_PLATFORM_STORES = 500
const MAX_ORDERS_PER_STORE = 100

export type PlatformStore = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
}

export type PlatformStoreStats = PlatformStore & {
  approvedOrders: number
  pendingOrders: number
  refusedOrders: number
  totalOrders: number
  grossRevenue: number
  customers: number
  products: number
  commissionCents: number
}

export type PlatformOrder = {
  id: string
  ownerId: string
  storeName: string
  productName: string | null
  amount: number
  paymentStatus: string
  deliveryStatus: string
  gateway: string
  createdAt: Date
  customerName: string | null
  customerUsername: string | null
}

export async function getPlatformStores(): Promise<PlatformStore[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(and(isNull(user.ownerId), ne(user.role, "admin")))
    .orderBy(desc(user.createdAt))
    .limit(MAX_PLATFORM_STORES)
}

export async function getPlatformMemberStats() {
  const [summary, admins, linkedMembers] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      storeOwners: sql<number>`count(*) filter (where ${user.ownerId} is null and ${user.role} <> 'admin')::int`,
      tenantMembers: sql<number>`count(*) filter (where ${user.ownerId} is not null)::int`,
      platformAdmins: sql<number>`count(*) filter (where ${user.role} = 'admin' and ${user.ownerId} is null and lower(${user.email}) = ${PLATFORM_ADMIN_EMAIL})::int`,
    }).from(user),
    db.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }).from(user).where(and(eq(user.role, "admin"), isNull(user.ownerId), sql`lower(${user.email}) = ${PLATFORM_ADMIN_EMAIL}`)).orderBy(desc(user.createdAt)).limit(20),
    db.select({ id: user.id, name: user.name, email: user.email, role: user.role, ownerId: user.ownerId, createdAt: user.createdAt }).from(user).where(sql`${user.ownerId} is not null`).orderBy(desc(user.createdAt)).limit(50),
  ])

  return {
    summary: summary[0] ?? { total: 0, storeOwners: 0, tenantMembers: 0, platformAdmins: 0 },
    admins,
    linkedMembers,
  }
}

export async function getPlatformStoreStats(): Promise<PlatformStoreStats[]> {
  const stores = await getPlatformStores()
  const config = await getPlatformMisticPayConfig()

  const stats = await Promise.all(stores.map(async (store) => {
    return withTenantTx(store.id, async (tx) => {
      const orderStats = await tx.select({
        approvedOrders: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'approved')::int`,
        pendingOrders: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'pending')::int`,
        refusedOrders: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'refused')::int`,
        totalOrders: sql<number>`count(*)::int`,
        grossRevenue: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'approved' then ${orders.amount} else 0 end), 0)::float`,
      }).from(orders)

      const customerCount = await tx.select({ count: sql<number>`count(*)::int` }).from(customers)
      const productCount = await tx.select({ count: sql<number>`count(*)::int` }).from(products)
      const row = orderStats[0]
      const approvedOrders = Number(row?.approvedOrders ?? 0)

      return {
        ...store,
        approvedOrders,
        pendingOrders: Number(row?.pendingOrders ?? 0),
        refusedOrders: Number(row?.refusedOrders ?? 0),
        totalOrders: Number(row?.totalOrders ?? 0),
        grossRevenue: Number(row?.grossRevenue ?? 0),
        customers: Number(customerCount[0]?.count ?? 0),
        products: Number(productCount[0]?.count ?? 0),
        commissionCents: approvedOrders * config.commissionCents,
      }
    })
  }))

  return stats
}

export async function getPlatformOrders(): Promise<PlatformOrder[]> {
  const stores = await getPlatformStores()
  const rows = await Promise.all(stores.map((store) => withTenantTx(store.id, async (tx) => {
    return tx
      .select({
        id: orders.id,
        ownerId: orders.ownerId,
        productName: orders.productName,
        amount: orders.amount,
        paymentStatus: orders.paymentStatus,
        deliveryStatus: orders.deliveryStatus,
        gateway: orders.gateway,
        createdAt: orders.createdAt,
        customerName: customers.name,
        customerUsername: customers.username,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt))
      .limit(MAX_ORDERS_PER_STORE)
  })))

  return rows
    .flat()
    .map((row) => ({
      ...row,
      storeName: stores.find((store) => store.id === row.ownerId)?.name ?? "Tenant não identificado",
      amount: Number(row.amount ?? 0),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getPlatformOverview() {
  const [stores, memberStats, config] = await Promise.all([
    getPlatformStoreStats(),
    getPlatformMemberStats(),
    getPlatformMisticPayConfig(),
  ])

  const totals = stores.reduce((acc, store) => ({
    grossRevenue: acc.grossRevenue + store.grossRevenue,
    approvedOrders: acc.approvedOrders + store.approvedOrders,
    pendingOrders: acc.pendingOrders + store.pendingOrders,
    refusedOrders: acc.refusedOrders + store.refusedOrders,
    totalOrders: acc.totalOrders + store.totalOrders,
    customers: acc.customers + store.customers,
    products: acc.products + store.products,
    commissionCents: acc.commissionCents + store.commissionCents,
  }), {
    grossRevenue: 0,
    approvedOrders: 0,
    pendingOrders: 0,
    refusedOrders: 0,
    totalOrders: 0,
    customers: 0,
    products: 0,
    commissionCents: 0,
  })

  return { totals, stores, memberStats, config }
}
