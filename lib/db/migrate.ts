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

    // 0. Criar extensão para UUIDs
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    // 0.1 Criar tabelas do Better Auth (user, session, account, verification)
    // Sem estas tabelas, o cadastro falha com "Failed to create user"
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        "ownerId" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `)

    // 0.2 Tabela twoFactor (plugin Better Auth) — sem ela o cadastro falha
    // com "Failed to create user"
    await client.query(`
      CREATE TABLE IF NOT EXISTS "twoFactor" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        secret TEXT NOT NULL,
        "backupCodes" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        verified BOOLEAN DEFAULT TRUE,
        "failedVerificationCount" INTEGER DEFAULT 0,
        "lockedUntil" TIMESTAMP
      );
    `)

    // 0.3 Coluna twoFactorEnabled na tabela user (plugin Better Auth)
        await addColumnIfMissing(client, "user", "twoFactorEnabled", "BOOLEAN DEFAULT FALSE")

    // 0.4 Coluna onboardingSeen — contas existentes = TRUE (nao veem tutorial)
    // contas novas = FALSE (veem tutorial na primeira vez)
    await addColumnIfMissing(client, "user", "onboardingSeen", "BOOLEAN NOT NULL DEFAULT TRUE")

    // 1. Criar tabelas base se não existirem (já com UUID onde solicitado)
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
      );
    `)

    // 2. Garantir que as tabelas customers, orders e telegram_posts usem UUID
    // Esta função lida com a migração de SERIAL para UUID de forma segura.
    await migrateTableToUuid(client, "customers", []);
    await migrateTableToUuid(client, "orders", [
      { table: "deliveries", column: "orderId" },
      { table: "stock_items", column: "orderId" }
    ]);
    await migrateTableToUuid(client, "telegram_posts", [
      { table: "telegram_schedules", column: "postId" },
      { table: "telegram_queue", column: "postId" }
    ]);

    // Atualizar referências cruzadas que não são PKs
    await updateColumnToText(client, "orders", "customerId");
    await updateColumnToText(client, "deliveries", "customerId");

    // 3. Outras tabelas e colunas
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

    // Garantir índices únicos
    const indexes = [
      { name: "telegram_chats_owner_chatid_uidx", table: "telegram_chats", cols: '("ownerId", "chatId")' },
      { name: "telegram_topics_owner_chat_thread_uidx", table: "telegram_topics", cols: '("ownerId", "chatId", "threadId")' },
      { name: "coupons_owner_code_uidx", table: "coupons", cols: '("ownerId", code)' },
      { name: "customers_owner_telegramid_uidx", table: "customers", cols: '("ownerId", "telegramId")' },
      { name: "settings_owner_key_uidx", table: "settings", cols: '("ownerId", key)' }
    ]

    for (const idx of indexes) {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '${idx.name}') THEN
            CREATE UNIQUE INDEX ${idx.name} ON ${idx.table} ${idx.cols};
          END IF;
        END $$;
      `)
    }

    // Colunas extras
    await addColumnIfMissing(client, "customers", "activeCoupon", "TEXT");
    await addColumnIfMissing(client, "orders", "originalAmount", "NUMERIC(12,2)");
    await addColumnIfMissing(client, "orders", "couponCode", "TEXT");

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

async function addColumnIfMissing(client: any, table: string, column: string, type: string) {
  await client.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}') THEN
        ALTER TABLE ${table} ADD COLUMN "${column}" ${type};
      END IF;
    END $$;
  `)
}

async function updateColumnToText(client: any, table: string, column: string) {
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='${table}' AND column_name='${column}' AND data_type='integer'
      ) THEN
        ALTER TABLE ${table} ALTER COLUMN "${column}" TYPE TEXT USING "${column}"::TEXT;
      END IF;
    END $$;
  `)
}

async function migrateTableToUuid(client: any, tableName: string, references: { table: string, column: string }[]) {
  // Verifica se a coluna ID já é TEXT/UUID
  const res = await client.query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = '${tableName}' AND column_name = 'id';
  `)
  
  if (res.rows.length === 0) {
    // Tabela não existe, cria ela já com UUID
    // Nota: Isso é simplificado, o ideal seria ter o CREATE TABLE completo aqui.
    // Mas para o propósito do SaaS, as tabelas principais já existem.
    return;
  }

  if (res.rows[0].data_type === 'text' || res.rows[0].data_type === 'uuid') {
    return; // Já migrado
  }

  console.log(`[db/migrate] Migrando tabela ${tableName} para UUID...`)

  // 1. Adicionar nova coluna UUID
  await client.query(`ALTER TABLE ${tableName} ADD COLUMN id_new TEXT DEFAULT gen_random_uuid();`)
  
  // 2. Popular id_new para registros existentes
  await client.query(`UPDATE ${tableName} SET id_new = gen_random_uuid() WHERE id_new IS NULL;`)

  // 3. Atualizar referências em outras tabelas
  for (const ref of references) {
    // Garantir que a coluna de referência seja TEXT
    await updateColumnToText(client, ref.table, ref.column);
    
    // Atualizar os valores para bater com o novo UUID
    await client.query(`
      UPDATE ${ref.table} r
      SET "${ref.column}" = t.id_new
      FROM ${tableName} t
      WHERE r."${ref.column}" = t.id::TEXT;
    `)
  }

  // 4. Trocar PK
  // Remover PK antiga (geralmente nomeada como table_pkey)
  await client.query(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${tableName}_pkey CASCADE;`)
  
  // Remover coluna antiga
  await client.query(`ALTER TABLE ${tableName} DROP COLUMN id;`)
  
  // Renomear id_new para id
  await client.query(`ALTER TABLE ${tableName} RENAME COLUMN id_new TO id;`)
  
  // Adicionar nova PK
  await client.query(`ALTER TABLE ${tableName} ADD PRIMARY KEY (id);`)
}

// v1.1.0 - Migração para UUIDs e Criptografia em repouso
