import { pool } from "./index"

/**
 * Executa as migrações necessárias para garantir que o banco de dados
 * tenha a estrutura esperada pelo código.
 */
export async function ensureDbStructure() {
  if (!process.env.DATABASE_URL) {
    console.warn("[db/migrate] DATABASE_URL não configurada. Pulando migração.")
    return
  }
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 1. Criar tabela telegram_chats se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_chats (
        id SERIAL PRIMARY KEY,
        "ownerId" TEXT NOT NULL,
        title TEXT NOT NULL,
        "chatId" TEXT NOT NULL,
        username TEXT,
        type TEXT DEFAULT 'group' NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        "botIsAdmin" BOOLEAN DEFAULT FALSE NOT NULL,
        "missingPermissions" TEXT,
        "grantedPermissions" TEXT,
        purpose TEXT DEFAULT 'audience' NOT NULL,
        "isForum" BOOLEAN DEFAULT FALSE NOT NULL,
        "memberCount" INTEGER,
        "lastSyncedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    // 2. Adicionar colunas faltantes (caso a tabela já existisse de uma versão antiga)
    const columns = [
      { name: "isForum", type: "BOOLEAN DEFAULT FALSE NOT NULL" },
      { name: "memberCount", type: "INTEGER" },
      { name: "lastSyncedAt", type: "TIMESTAMP" },
      { name: "missingPermissions", type: "TEXT" },
      { name: "grantedPermissions", type: "TEXT" },
      { name: "purpose", type: "TEXT DEFAULT 'audience' NOT NULL" }
    ]

    for (const col of columns) {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='telegram_chats' AND column_name='${col.name}') THEN
            ALTER TABLE telegram_chats ADD COLUMN "${col.name}" ${col.type};
          END IF;
        END $$;
      `)
    }

    // 3. Garantir índice único
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'telegram_chats_owner_chatid_uidx') THEN
          CREATE UNIQUE INDEX telegram_chats_owner_chatid_uidx ON telegram_chats ("ownerId", "chatId");
        END IF;
      END $$;
    `)

    // 4. Garantir tabela telegram_topics
    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_topics (
        id SERIAL PRIMARY KEY,
        "ownerId" TEXT NOT NULL,
        "chatId" TEXT NOT NULL,
        "threadId" INTEGER NOT NULL,
        name TEXT NOT NULL,
        source TEXT DEFAULT 'auto' NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        "lastSeenAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    // 5. Garantir índice único em tópicos
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'telegram_topics_owner_chat_thread_uidx') THEN
          CREATE UNIQUE INDEX telegram_topics_owner_chat_thread_uidx ON telegram_topics ("ownerId", "chatId", "threadId");
        END IF;
      END $$;
    `)

    // 6. Criar tabela coupons se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        "ownerId" TEXT NOT NULL,
        code TEXT NOT NULL,
        "discountPercent" INTEGER NOT NULL,
        "maxUses" INTEGER,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    // 7. Garantir índice único em coupons
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'coupons_owner_code_uidx') THEN
          CREATE UNIQUE INDEX coupons_owner_code_uidx ON coupons ("ownerId", code);
        END IF;
      END $$;
    `)

    // 8. Adicionar colunas faltantes em customers (activeCoupon)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='activeCoupon') THEN
          ALTER TABLE customers ADD COLUMN "activeCoupon" TEXT;
        END IF;
      END $$;
    `)

    // 8b. BUGFIX: criar índice único em customers(ownerId, telegramId).
    // Necessário para o upsert atômico em upsertCustomer. Sem este índice,
    // o ON CONFLICT falha com erro de constraint inexistente, o que propaga
    // como exceção não tratada e silencia o bot no /start.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'customers_owner_telegramid_uidx') THEN
          CREATE UNIQUE INDEX customers_owner_telegramid_uidx ON customers ("ownerId", "telegramId");
        END IF;
      END $$;
    `)

    // 9. Adicionar colunas faltantes em orders (originalAmount, couponCode)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='originalAmount') THEN
          ALTER TABLE orders ADD COLUMN "originalAmount" NUMERIC(12,2);
        END IF;
      END $$;
    `)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='couponCode') THEN
          ALTER TABLE orders ADD COLUMN "couponCode" TEXT;
        END IF;
      END $$;
    `)

    await client.query("COMMIT")
    console.log("[db/migrate] Estrutura do banco de dados verificada/atualizada com sucesso.")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[db/migrate] Falha ao garantir estrutura do banco:", err)
    throw err
  } finally {
    client.release()
  }
}

// v1.0.1 - Forced redeploy for Vercel synchronization

// v1.0.2 - Forced redeploy for database synchronization and table creation

// v1.0.3 - BUGFIX: added unique index on customers(ownerId, telegramId) to
// support atomic upsert in upsertCustomer and prevent /start silence on race.
