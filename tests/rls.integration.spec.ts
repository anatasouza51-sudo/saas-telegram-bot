import { test, expect } from "@playwright/test"
import { Pool } from "pg"

const databaseUrl = process.env.RLS_TEST_DATABASE_URL

test.describe("RLS PostgreSQL — isolamento cross-tenant", () => {
  test("bloqueia leitura, mutação e associação cross-tenant", async () => {
    test.skip(!databaseUrl, "Defina RLS_TEST_DATABASE_URL para executar contra PostgreSQL real")

    const pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 10_000,
      ssl: databaseUrl && !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1")
        ? { rejectUnauthorized: true }
        : undefined,
    })
    const client = await pool.connect()
    const tenantA = `rls-test-a-${Date.now()}`
    const tenantB = `rls-test-b-${Date.now()}`
    let categoryA: number | null = null
    let categoryB: number | null = null

    try {
      const rlsState = await client.query(`
        SELECT relrowsecurity, relforcerowsecurity
        FROM pg_class
        WHERE oid = 'public.categories'::regclass
      `)
      expect(rlsState.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true })

      const policies = await client.query(`
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'categories'
      `)
      expect(policies.rows.map((row) => row.policyname)).toEqual(
        expect.arrayContaining(["categories_tenant_access", "categories_tenant_isolation"]),
      )

      await client.query("BEGIN")
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantA])
      categoryA = Number((await client.query(`
        INSERT INTO public.categories ("ownerId", name, slug)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [tenantA, "RLS A", `${tenantA}-category`])).rows[0].id)
      await client.query("COMMIT")

      await client.query("BEGIN")
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantB])
      categoryB = Number((await client.query(`
        INSERT INTO public.categories ("ownerId", name, slug)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [tenantB, "RLS B", `${tenantB}-category`])).rows[0].id)
      await client.query("COMMIT")

      await client.query("BEGIN")
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantA])
      const visibleToA = await client.query(
        'SELECT id, "ownerId" FROM public.categories WHERE id = ANY($1::int[])',
        [[categoryA, categoryB]],
      )
      expect(visibleToA.rows).toEqual([{ id: categoryA, ownerId: tenantA }])

      const updateB = await client.query(
        'UPDATE public.categories SET name = $1 WHERE id = $2',
        ["cross-tenant-update", categoryB],
      )
      expect(updateB.rowCount).toBe(0)

      const deleteB = await client.query(
        'DELETE FROM public.categories WHERE id = $1',
        [categoryB],
      )
      expect(deleteB.rowCount).toBe(0)

      await expect(client.query(`
        INSERT INTO public.categories ("ownerId", name, slug)
        VALUES ($1, $2, $3)
      `, [tenantB, "forged owner", `${tenantA}-forged`])).rejects.toMatchObject({ code: "42501" })
      await client.query("ROLLBACK")

      await client.query("BEGIN")
      const withoutContext = await client.query(
        'SELECT id FROM public.categories WHERE id = $1',
        [categoryA],
      )
      expect(withoutContext.rows).toEqual([])
      await client.query("ROLLBACK")
    } finally {
      await client.query("ROLLBACK").catch(() => {})
      if (categoryA !== null) {
        await client.query("BEGIN")
        await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantA])
        await client.query("DELETE FROM public.categories WHERE id = $1", [categoryA])
        await client.query("COMMIT")
      }
      if (categoryB !== null) {
        await client.query("BEGIN")
        await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantB])
        await client.query("DELETE FROM public.categories WHERE id = $1", [categoryB])
        await client.query("COMMIT")
      }
      client.release()
      await pool.end()
    }
  })
})
